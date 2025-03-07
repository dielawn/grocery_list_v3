// NostrService.js - Development Mode
// This version doesn't rely on any specific nostr-tools API
// and will work even if nostr-tools is not available

class NostrService {
  constructor() {
    this.isConnected = true; // Always pretend to be connected in dev mode
    this.subscriptions = new Map();
    this.keys = this.getUserKeys();
    
    console.log('NostrService initialized in development mode');
  }

  /**
   * Generate a random hex string of specified length
   * @param {number} length - The length of the hex string
   * @returns {string} - A random hex string
   */
  generateRandomHex(length) {
    const characters = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  /**
   * Generate user keys (in development mode these are just random strings)
   * @returns {Object} - The private and public keys
   */
  generateUserKeys() {
    // In dev mode, just generate random strings
    return {
      privateKey: this.generateRandomHex(64), // 32 bytes = 64 hex chars
      publicKey: this.generateRandomHex(64)   // Public key would normally be derived
    };
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
   * Connect to Nostr relays (simulated in dev mode)
   * @returns {Promise<void>}
   */
  async connect() {
    // In dev mode, just pretend to connect
    console.log('Simulated connection to Nostr relays in development mode');
    this.isConnected = true;
    return Promise.resolve();
  }

  /**
   * Disconnect from all relays (simulated in dev mode)
   */
  disconnect() {
    // In dev mode, just pretend to disconnect
    console.log('Simulated disconnection from Nostr relays in development mode');
    this.isConnected = false;
    this.subscriptions.clear();
  }

  /**
   * Create a new grocery list (simulated in dev mode)
   * @param {string} listName - Name of the grocery list
   * @param {Array} initialItems - Initial grocery items
   * @returns {Promise<string>} - The ID of the created list
   */
  async createGroceryList(listName, initialItems) {
    console.log('Creating simulated grocery list in development mode');
    console.log('Initial items:', initialItems);
    
    // Generate a random ID
    const listId = 'list_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    
    // Store in local storage for persistence
    const listData = {
      id: listId,
      name: listName,
      items: [...initialItems], // Make a copy to ensure we don't have reference issues
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      owner: this.keys.publicKey
    };
    
    console.log('Storing list data:', listData);
    
    // Store in local storage
    const existingLists = JSON.parse(localStorage.getItem('devModeLists') || '[]');
    existingLists.push(listData);
    localStorage.setItem('devModeLists', JSON.stringify(existingLists));
    
    console.log(`Dev mode: Created grocery list "${listName}" with ID: ${listId}`);
    return Promise.resolve(listId);
  }

  /**
   * Share a grocery list with another user (simulated in dev mode)
   * @param {string} listId - The ID of the list to share
   * @param {string} listName - The name of the list
   * @param {string} recipientPublicKey - The public key of the recipient
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async shareListWithUser(listId, listName, recipientPublicKey) {
    console.log(`Dev mode: Pretending to share list "${listName}" with user ${recipientPublicKey.substring(0, 6)}...`);
    
    // In a real implementation, this would send an encrypted message via Nostr
    // In dev mode, we just simulate success
    return Promise.resolve(true);
  }

  /**
   * Update a grocery list (simulated in dev mode)
   * @param {string} listId - The ID of the list to update
   * @param {string} listName - The name of the list
   * @param {Array} updatedItems - The updated list of grocery items
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async updateGroceryList(listId, listName, updatedItems) {
    console.log(`Dev mode: Updating grocery list "${listName}" with items:`, updatedItems);
    
    // Update in local storage
    const existingLists = JSON.parse(localStorage.getItem('devModeLists') || '[]');
    const listIndex = existingLists.findIndex(list => list.id === listId);
    
    if (listIndex >= 0) {
      existingLists[listIndex] = {
        ...existingLists[listIndex],
        name: listName,
        items: [...updatedItems], // Make a copy to ensure we don't have reference issues
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem('devModeLists', JSON.stringify(existingLists));
      console.log("Updated list in storage:", existingLists[listIndex]);
    } else {
      console.warn(`List with ID ${listId} not found`);
    }
    
    return Promise.resolve(true);
  }

  /**
   * Remove an item from a grocery list (simulated in dev mode)
   * @param {string} listId - The ID of the list
   * @param {string} listName - The name of the list
   * @param {Array} currentItems - The current grocery items
   * @param {string} itemNameToRemove - The name of the item to remove
   * @returns {Promise<Array>} - The updated list of grocery items
   */
  async removeGroceryItem(listId, listName, currentItems, itemNameToRemove) {
    console.log(`Dev mode: Removing item "${itemNameToRemove}" from list "${listName}"`);
    
    // Remove the item
    const updatedItems = currentItems.filter(item => item.name !== itemNameToRemove);
    
    // Update the list
    await this.updateGroceryList(listId, listName, updatedItems);
    
    return Promise.resolve(updatedItems);
  }

  /**
   * Subscribe to updates for a specific grocery list (simulated in dev mode)
   * @param {string} listId - The ID of the list to subscribe to
   * @param {Function} onUpdate - Callback function when updates are received
   * @returns {string} - Subscription ID
   */
  subscribeToListUpdates(listId, onUpdate) {
    console.log(`Dev mode: Subscribing to updates for list: ${listId}`);
    
    const subId = `list-${listId}`;
    
    // Check if already subscribed
    if (this.subscriptions.has(subId)) {
      console.log(`Dev mode: Already subscribed to list: ${listId}`);
      return subId;
    }
    
    // Create a fake subscription object
    const subscription = {
      id: subId,
      listId: listId,
      unsub: () => {
        console.log(`Dev mode: Unsubscribed from list: ${listId}`);
        this.subscriptions.delete(subId);
      }
    };
    
    this.subscriptions.set(subId, subscription);
    
    return subId;
  }

  /**
   * Unsubscribe from list updates (simulated in dev mode)
   * @param {string} subscriptionId - The ID of the subscription to cancel
   */
  unsubscribeFromList(subscriptionId) {
    if (this.subscriptions.has(subscriptionId)) {
      const sub = this.subscriptions.get(subscriptionId);
      sub.unsub();
    }
  }

  /**
   * Listen for list invites (simulated in dev mode)
   * @param {Function} onInvite - Callback when an invite is received
   * @returns {string} - Subscription ID
   */
  listenForListInvites(onInvite) {
    console.log('Dev mode: Listening for list invites (simulated)');
    
    const subId = 'list-invites';
    
    // Check if already subscribed
    if (this.subscriptions.has(subId)) {
      console.log('Dev mode: Already listening for list invites');
      return subId;
    }
    
    // Create a fake subscription object
    const subscription = {
      id: subId,
      unsub: () => {
        console.log('Dev mode: Stopped listening for list invites');
        this.subscriptions.delete(subId);
      }
    };
    
    this.subscriptions.set(subId, subscription);
    
    return subId;
  }

  /**
   * Get all grocery lists (simulated in dev mode)
   * @param {Function} onListsReceived - Callback with the lists
   * @returns {Promise<string>} - Subscription ID
   */
  async getMyGroceryLists(onListsReceived) {
    console.log('Dev mode: Fetching grocery lists');
    
    // Get lists from local storage
    const localLists = JSON.parse(localStorage.getItem('devModeLists') || '[]');
    
    // Filter to only show lists owned by this user
    const myLists = localLists.filter(list => list.owner === this.keys.publicKey);
    
    // Sort by update time
    myLists.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    // If no lists exist, create a demo list
    if (myLists.length === 0) {
      const demoListId = await this.createGroceryList('Demo Grocery List', [
        { name: 'Milk', qty: 1, unit: 'gallon', aisle: 'dairy' },
        { name: 'Bread', qty: 1, unit: 'loaf', aisle: 'bakery' },
        { name: 'Eggs', qty: 12, unit: '', aisle: 'dairy' },
        { name: 'Apples', qty: 6, unit: '', aisle: 'produce' }
      ]);
      
      // Fetch the lists again
      const updatedLists = JSON.parse(localStorage.getItem('devModeLists') || '[]');
      const myUpdatedLists = updatedLists.filter(list => list.owner === this.keys.publicKey);
      
      // Call the callback
      setTimeout(() => onListsReceived(myUpdatedLists), 300);
    } else {
      // Call the callback with the lists
      setTimeout(() => onListsReceived(myLists), 300);
    }
    
    const subId = 'my-lists';
    
    // Create a fake subscription
    const subscription = {
      id: subId,
      unsub: () => {
        console.log('Dev mode: Unsubscribed from my lists');
        this.subscriptions.delete(subId);
      }
    };
    
    this.subscriptions.set(subId, subscription);
    
    return subId;
  }

  /**
   * Accept a list invite (simulated in dev mode)
   * @param {string} listId - The ID of the invited list
   * @param {Function} onUpdate - Callback for list updates
   * @returns {string} - Subscription ID
   */
  acceptListInvite(listId, onUpdate) {
    console.log(`Dev mode: Accepting list invite for: ${listId}`);
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
   * Format a public key for display
   * @param {string} publicKey - The public key to format
   * @returns {string} - A shortened version of the public key
   */
  formatPublicKey(publicKey) {
    if (!publicKey) return '';
    return `${publicKey.substring(0, 6)}...${publicKey.substring(publicKey.length - 4)}`;
  }
}

export default NostrService;