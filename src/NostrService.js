// NostrService.js - Production Version
import { 
  generateSecretKey, 
  getPublicKey, 
  finalizeEvent,
  verifyEvent
} from 'nostr-tools/pure';
import { SimplePool } from 'nostr-tools/pool';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import * as nip19 from 'nostr-tools/nip19';

// List of Nostr relays to connect to
const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nostr.bitcoiner.social',
  'wss://relay.nostr.info'
];

// Event kinds
const EVENT_KINDS = {
  GROCERY_LIST: 30000, // Using a high number range for custom events
  LIST_INVITE: 30001
};

class NostrService {
  constructor() {
    this.isConnected = false;
    this.pool = null;
    this.relays = DEFAULT_RELAYS;
    this.subscriptions = new Map();
    this.keys = this.getUserKeys();
    this.listCache = new Map(); // Cache for list data
    
    console.log('NostrService initialized with public key:', this.formatPublicKey(this.keys.publicKey));
  }

  /**
   * Generate a new private key
   * @returns {Object} - An object containing privateKey and publicKey
   */
  generateUserKeys() {
    const secretKey = generateSecretKey();
    const privateKey = this.bytesToHex(secretKey);
    const publicKey = getPublicKey(secretKey);
    
    return { privateKey, publicKey };
  }

  /**
   * Convert bytes to hex string
   * @param {Uint8Array} bytes - Byte array
   * @returns {string} - Hex string
   */
  bytesToHex(bytes) {
    if (!bytes) return '';
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Convert hex string to bytes
   * @param {string} hex - Hex string
   * @returns {Uint8Array} - Byte array
   */
  hexToBytes(hex) {
    if (!hex) return new Uint8Array(0);
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  /**
   * Save Nostr keys to local storage
   * @param {Object} keys - The private and public keys
   */
  saveUserKeys(keys) {
    localStorage.setItem('nostrPrivateKey', keys.privateKey);
    localStorage.setItem('nostrPublicKey', keys.publicKey);
    this.keys = keys;
  }

  /**
   * Get existing keys or generate new ones
   * @returns {Object} The private and public keys
   */
  getUserKeys() {
    const privateKey = localStorage.getItem('nostrPrivateKey');
    const publicKey = localStorage.getItem('nostrPublicKey');
    
    if (!privateKey || !publicKey) {
      const newKeys = this.generateUserKeys();
      this.saveUserKeys(newKeys);
      return newKeys;
    }
    
    return { privateKey, publicKey };
  }

  /**
   * Connect to Nostr relays
   * @returns {Promise<void>}
   */
  async connect() {
    if (this.isConnected) return;

    try {
      // Create a new pool instance
      this.pool = new SimplePool();
      
      // Test connection to each relay with a timeout
      const connectionPromises = this.relays.map(relay => {
        return Promise.race([
          this.pool.ensureRelay(relay)
            .catch(err => {
              console.warn(`Failed to connect to relay ${relay}:`, err);
              return null; // Return null for failed connections
            }),
          new Promise(resolve => {
            // Timeout after 5 seconds
            setTimeout(() => {
              console.warn(`Connection to ${relay} timed out`);
              resolve(null);
            }, 5000);
          })
        ]);
      });
      
      // Wait for all connections to be attempted
      const connectedRelays = await Promise.all(connectionPromises);
      
      // Filter out failed connections
      this.connectedRelays = connectedRelays.filter(relay => relay !== null);
      
      if (this.connectedRelays.length === 0) {
        console.warn('Failed to connect to any relays, but will continue in offline mode');
        // Don't throw, just operate in offline mode
      }
      
      this.isConnected = this.connectedRelays.length > 0;
      console.log(`Connected to ${this.connectedRelays.length} relays`);
      
      return;
    } catch (error) {
      console.error('Error connecting to relays:', error);
      // Don't throw, just operate in offline mode
      this.isConnected = false;
    }
  }

  /**
   * Disconnect from all relays
   */
  disconnect() {
    try {
      // Close all subscriptions
      this.subscriptions.forEach(sub => {
        try {
          if (sub && typeof sub.unsub === 'function') {
            sub.unsub();
          }
        } catch (subError) {
          console.warn('Error closing subscription:', subError);
        }
      });
      
      this.subscriptions.clear();
      
      // Close the pool if it exists
      if (this.pool) {
        try {
          // Safely attempt to close the pool
          if (typeof this.pool.close === 'function') {
            this.pool.close();
          }
        } catch (poolError) {
          console.warn('Error closing pool:', poolError);
        }
        
        this.pool = null;
      }
      
      this.isConnected = false;
      console.log('Disconnected from all relays');
    } catch (error) {
      console.error('Error during disconnect:', error);
    }
  }

  /**
   * Create and sign an event
   * @param {number} kind - The event kind
   * @param {Object} content - The event content (will be stringified)
   * @param {Array} tags - Optional event tags
   * @returns {Object} - The signed event
   */
  createSignedEvent(kind, content, tags = []) {
    const eventTemplate = {
      kind,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content: JSON.stringify(content),
    };
    
    try {
      // This assigns the pubkey, calculates the event id, and signs the event
      return finalizeEvent(eventTemplate, this.hexToBytes(this.keys.privateKey));
    } catch (error) {
      console.error('Error creating signed event:', error);
      throw error;
    }
  }

  /**
   * Publish an event to the relays
   * @param {Object} event - The event to publish
   * @returns {Promise<string>} - The event ID
   */
  async publishEvent(event) {
    if (!this.isConnected) {
      throw new Error('Not connected to relays');
    }
    
    try {
      await Promise.any(this.pool.publish(this.relays, event));
      console.log('Event published successfully:', event.id);
      return event.id;
    } catch (error) {
      console.error('Error publishing event:', error);
      throw error;
    }
  }

  /**
   * Create a new grocery list
   * @param {string} listName - Name of the grocery list
   * @param {Array} initialItems - Initial grocery items
   * @returns {Promise<string>} - The ID of the created list
   */
  async createGroceryList(listName, initialItems) {
    const listData = {
      id: `list_${Date.now()}`,
      name: listName,
      items: [...initialItems], // Make a copy to ensure we don't have reference issues
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      owner: this.keys.publicKey
    };
    
    // Cache the list data
    this.listCache.set(listData.id, listData);
    
    // Create event tags
    const tags = [
      ['d', listData.id], // Unique identifier for this list
      ['type', 'grocery-list'],
      ['name', listName]
    ];
    
    // Create and publish the event
    const event = this.createSignedEvent(EVENT_KINDS.GROCERY_LIST, listData, tags);
    await this.publishEvent(event);
    
    console.log(`Created grocery list "${listName}" with ID: ${listData.id}`);
    return listData.id;
  }

  /**
   * Share a grocery list with another user
   * @param {string} listId - The ID of the list to share
   * @param {string} listName - The name of the list
   * @param {string} recipientPublicKey - The public key of the recipient
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async shareListWithUser(listId, listName, recipientPublicKey) {
    // Check if the input looks like an npub
    if (recipientPublicKey.startsWith('npub1')) {
      try {
        // Decode npub to hex
        const { type, data } = nip19.decode(recipientPublicKey);
        if (type === 'npub') {
          recipientPublicKey = data;
        }
      } catch (error) {
        console.error('Invalid npub format:', error);
        throw new Error('Invalid npub format');
      }
    }
    
    // Get the list data from cache or fetch it
    let listData = this.listCache.get(listId);
    
    if (!listData) {
      const lists = await this.getMyGroceryListsSync();
      listData = lists.find(list => list.id === listId);
      
      if (!listData) {
        throw new Error(`List with ID ${listId} not found`);
      }
    }
    
    // Create the invite content
    const inviteContent = {
      listId,
      listName,
      senderPublicKey: this.keys.publicKey,
      createdAt: new Date().toISOString()
    };
    
    // Create event tags
    const tags = [
      ['p', recipientPublicKey], // Tag the recipient
      ['d', `invite_${listId}_${Date.now()}`], // Unique identifier for this invite
      ['type', 'list-invite'],
      ['list', listId],
      ['name', listName]
    ];
    
    // Create and publish the event
    const event = this.createSignedEvent(EVENT_KINDS.LIST_INVITE, inviteContent, tags);
    await this.publishEvent(event);
    
    console.log(`Shared list "${listName}" with user ${this.formatPublicKey(recipientPublicKey)}`);
    return true;
  }

  /**
   * Update a grocery list
   * @param {string} listId - The ID of the list to update
   * @param {string} listName - The name of the list
   * @param {Array} updatedItems - The updated list of grocery items
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async updateGroceryList(listId, listName, updatedItems) {
    // Get the original list data
    let listData = this.listCache.get(listId);
    
    if (!listData) {
      const lists = await this.getMyGroceryListsSync();
      listData = lists.find(list => list.id === listId);
      
      if (!listData) {
        throw new Error(`List with ID ${listId} not found`);
      }
    }
    
    // Update the list data
    const updatedList = {
      ...listData,
      name: listName,
      items: [...updatedItems], // Make a copy to ensure we don't have reference issues
      updatedAt: new Date().toISOString()
    };
    
    // Cache the updated list
    this.listCache.set(listId, updatedList);
    
    // Create event tags
    const tags = [
      ['d', listId], // Unique identifier for this list
      ['type', 'grocery-list'],
      ['name', listName]
    ];
    
    // Create and publish the event
    const event = this.createSignedEvent(EVENT_KINDS.GROCERY_LIST, updatedList, tags);
    await this.publishEvent(event);
    
    console.log(`Updated grocery list "${listName}"`);
    return true;
  }

  /**
   * Remove an item from a grocery list
   * @param {string} listId - The ID of the list
   * @param {string} listName - The name of the list
   * @param {Array} currentItems - The current grocery items
   * @param {string} itemNameToRemove - The name of the item to remove
   * @returns {Promise<Array>} - The updated list of grocery items
   */
  async removeGroceryItem(listId, listName, currentItems, itemNameToRemove) {
    // Remove the item
    const updatedItems = currentItems.filter(item => item.name !== itemNameToRemove);
    
    // Update the list
    await this.updateGroceryList(listId, listName, updatedItems);
    
    return updatedItems;
  }

  /**
   * Synchronously get the list of grocery lists
   * @returns {Promise<Array>} - Array of grocery lists
   */
  async getMyGroceryListsSync() {
    if (!this.isConnected) {
      console.warn('Not connected to relays, returning cached lists');
      // Return cached lists if available
      const cachedLists = Array.from(this.listCache.values())
        .filter(list => list.owner === this.keys.publicKey)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      
      if (cachedLists.length > 0) {
        return cachedLists;
      }
      
      // Return empty array instead of throwing
      return [];
    }
    
    try {
      // Filter for grocery list events created by the user
      const filter = {
        kinds: [EVENT_KINDS.GROCERY_LIST],
        authors: [this.keys.publicKey],
        '#type': ['grocery-list']
      };
      
      // Fetch events with a timeout
      const fetchPromise = this.pool.querySync ? 
        this.pool.querySync(this.relays, filter) : 
        this.pool.list ? 
          this.pool.list(this.relays, [filter]) : 
          Promise.resolve([]);
          
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout fetching grocery lists')), 5000);
      });
      
      const events = await Promise.race([fetchPromise, timeoutPromise])
        .catch(error => {
          console.warn('Error or timeout fetching grocery lists:', error);
          return []; // Return empty array on error
        });
      
      // Process the events into grocery lists
      const lists = (Array.isArray(events) ? events : []).map(event => {
        try {
          const listData = JSON.parse(event.content);
          return listData;
        } catch (error) {
          console.error('Error parsing list data:', error);
          return null;
        }
      }).filter(list => list !== null);
      
      // Sort by update time (newest first)
      lists.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      
      // Cache the lists
      lists.forEach(list => {
        this.listCache.set(list.id, list);
      });
      
      return lists;
    } catch (error) {
      console.error('Error fetching grocery lists:', error);
      
      // Return cached lists if available
      const cachedLists = Array.from(this.listCache.values())
        .filter(list => list.owner === this.keys.publicKey)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      
      if (cachedLists.length > 0) {
        console.log('Returning cached lists due to fetch error');
        return cachedLists;
      }
      
      // Return empty array instead of throwing
      return [];
    }
  }

  /**
   * Get all grocery lists
   * @param {Function} onListsReceived - Callback with the lists
   * @returns {string} - Subscription ID
   */
  async getMyGroceryLists(onListsReceived) {
    if (!this.isConnected) {
      throw new Error('Not connected to relays');
    }
    
    try {
      // First, get the current lists synchronously
      const currentLists = await this.getMyGroceryListsSync();
      
      // Call the callback with the current lists
      onListsReceived(currentLists);
      
      // Then set up a subscription for future updates
      const filter = {
        kinds: [EVENT_KINDS.GROCERY_LIST],
        authors: [this.keys.publicKey],
        '#type': ['grocery-list'],
        since: Math.floor(Date.now() / 1000) // Only get updates from now on
      };
      
      const subId = `my-lists-${Date.now()}`;
      
      let sub;
      try {
        sub = this.pool.subscribeMany(this.relays, [filter], {
          onevent(event) {
            try {
              const listData = JSON.parse(event.content);
              
              // Cache the list data
              this.listCache.set(listData.id, listData);
              
              // Get all current lists
              const updatedLists = Array.from(this.listCache.values())
                .filter(list => list.owner === this.keys.publicKey)
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
              
              // Call the callback with the updated lists
              onListsReceived(updatedLists);
            } catch (error) {
              console.error('Error processing list update:', error);
            }
          },
          oneose() {
            console.log('Received EOSE for grocery lists subscription');
          }
        });
      } catch (subError) {
        console.error('Error creating subscription:', subError);
        // Create a dummy subscription that does nothing when closed
        sub = { close: () => {} };
      }
      
      // Store the subscription
      this.subscriptions.set(subId, {
        id: subId,
        unsub: () => sub.close()
      });
      
      return subId;
    } catch (error) {
      console.error('Error setting up grocery lists subscription:', error);
      throw error;
    }
  }

  /**
   * Listen for list invites
   * @param {Function} onInvite - Callback when an invite is received
   * @returns {string} - Subscription ID
   */
  listenForListInvites(onInvite) {
    if (!this.isConnected) {
      throw new Error('Not connected to relays');
    }
    
    // Filter for invite events addressed to the user
    const filter = {
      kinds: [EVENT_KINDS.LIST_INVITE],
      '#p': [this.keys.publicKey],
      '#type': ['list-invite']
    };
    
    const subId = `list-invites-${Date.now()}`;
    
    const sub = this.pool.subscribeMany(this.relays, [filter], {
      onevent: (event) => {
        try {
          const inviteData = JSON.parse(event.content);
          
          // Process the invite
          onInvite({
            id: event.id,
            listId: inviteData.listId,
            listName: inviteData.listName,
            senderPublicKey: inviteData.senderPublicKey,
            createdAt: inviteData.createdAt
          });
        } catch (error) {
          console.error('Error processing list invite:', error);
        }
      },
      oneose: () => {
        console.log('Received EOSE for list invites subscription');
      }
    });
    
    // Store the subscription with a safe close method
    this.subscriptions.set(subId, {
      id: subId,
      unsub: () => {
        try {
          if (sub && typeof sub.close === 'function') {
            sub.close();
          }
        } catch (error) {
          console.warn('Error closing subscription:', error);
        }
      }
    });
    
    return subId;
  }

  /**
   * Subscribe to updates for a specific grocery list
   * @param {string} listId - The ID of the list to subscribe to
   * @param {Function} onUpdate - Callback function when updates are received
   * @returns {string} - Subscription ID
   */
  subscribeToListUpdates(listId, onUpdate) {
    if (!this.isConnected) {
      throw new Error('Not connected to relays');
    }
    
    // Filter for list update events
    const filter = {
      kinds: [EVENT_KINDS.GROCERY_LIST],
      '#d': [listId],
      '#type': ['grocery-list']
    };
    
    const subId = `list-${listId}-${Date.now()}`;
    
    const sub = this.pool.subscribeMany(this.relays, [filter], {
      onevent: (event) => {
        try {
          const listData = JSON.parse(event.content);
          
          // Cache the list data
          this.listCache.set(listId, listData);
          
          // Call the callback with the updated list data
          onUpdate(listData.items, listData.name, listData.updatedAt);
        } catch (error) {
          console.error('Error processing list update:', error);
        }
      },
      oneose: () => {
        console.log(`Received EOSE for list ${listId} subscription`);
      }
    });
    
    // Store the subscription
    this.subscriptions.set(subId, {
      id: subId,
      unsub: () => sub.close()
    });
    
    return subId;
  }

  /**
   * Unsubscribe from list updates
   * @param {string} subscriptionId - The ID of the subscription to cancel
   */
  unsubscribeFromList(subscriptionId) {
    if (this.subscriptions.has(subscriptionId)) {
      const sub = this.subscriptions.get(subscriptionId);
      sub.unsub();
      this.subscriptions.delete(subscriptionId);
    }
  }

  /**
   * Accept a list invite
   * @param {string} listId - The ID of the invited list
   * @param {Function} onUpdate - Callback for list updates
   * @returns {string} - Subscription ID
   */
  acceptListInvite(listId, onUpdate) {
    // Subscribe to updates for this list
    return this.subscribeToListUpdates(listId, onUpdate);
  }

  /**
   * Get the user's public key
   * @returns {string} - The user's public key
   */
  getPublicKey() {
    return this.keys.publicKey;
  }

  /**
   * Get the user's npub (encoded public key)
   * @returns {string} - The user's npub
   */
  getNpub() {
    return nip19.npubEncode(this.keys.publicKey);
  }

  /**
   * Format a public key for display
   * @param {string} publicKey - The public key to format
   * @returns {string} - A shortened version of the public key
   */
  formatPublicKey(publicKey) {
    if (!publicKey) return '';
    
    // Check if it's already an npub
    if (publicKey.startsWith('npub1')) {
      return `${publicKey.substring(0, 8)}...${publicKey.substring(publicKey.length - 4)}`;
    }
    
    // Convert to npub first
    try {
      const npub = nip19.npubEncode(publicKey);
      return `${npub.substring(0, 8)}...${npub.substring(npub.length - 4)}`;
    } catch (error) {
      // If conversion fails, just return a shortened hex version
      return `${publicKey.substring(0, 6)}...${publicKey.substring(publicKey.length - 4)}`;
    }
  }
}

export default NostrService;