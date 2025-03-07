// useNostr.js
import { useState, useEffect, useCallback, useRef } from 'react';
import NostrService from './NostrService';

/**
 * Custom hook for integrating Nostr functionality into React components
 */
const useNostr = () => {
  // Create a ref to ensure we use the same instance throughout component lifecycle
  const nostrServiceRef = useRef(null);
  
  // State for grocery lists and invites
  const [groceryLists, setGroceryLists] = useState([]);
  const [listInvites, setListInvites] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [publicKey, setPublicKey] = useState('');
  const [error, setError] = useState(null);

  // Initialize Nostr service
  useEffect(() => {
    if (!nostrServiceRef.current) {
      nostrServiceRef.current = new NostrService();
      setPublicKey(nostrServiceRef.current.getPublicKey());
    }
    
    // Connect to Nostr relays
    const connect = async () => {
      try {
        await nostrServiceRef.current.connect();
        setIsConnected(true);
        
        // Fetch the user's grocery lists
        await fetchGroceryLists();
        
        // Listen for list invites
        listenForInvites();
      } catch (err) {
        setError(err.message);
        console.error('Failed to connect to Nostr:', err);
      }
    };
    
    connect();
    
    // Cleanup on unmount
    return () => {
      if (nostrServiceRef.current) {
        nostrServiceRef.current.disconnect();
      }
    };
  }, []);

  // Fetch grocery lists
  const fetchGroceryLists = useCallback(async () => {
    if (!nostrServiceRef.current || !isConnected) return;
    
    try {
      await nostrServiceRef.current.getMyGroceryLists((lists) => {
        setGroceryLists(lists);
      });
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch grocery lists:', err);
    }
  }, [isConnected]);

  // Listen for list invites
  const listenForInvites = useCallback(() => {
    if (!nostrServiceRef.current || !isConnected) return;
    
    nostrServiceRef.current.listenForListInvites((invite) => {
      setListInvites(prev => {
        // Check if we already have this invite
        const exists = prev.some(inv => inv.listId === invite.listId);
        if (exists) return prev;
        return [...prev, invite];
      });
    });
  }, [isConnected]);

  // Create a new grocery list
  const createGroceryList = useCallback(async (listName, initialItems) => {
    if (!nostrServiceRef.current || !isConnected) {
      setError('Not connected to Nostr');
      return null;
    }
    
    try {
      const listId = await nostrServiceRef.current.createGroceryList(listName, initialItems);
      
      // Refresh the lists
      await fetchGroceryLists();
      
      return listId;
    } catch (err) {
      setError(err.message);
      console.error('Failed to create grocery list:', err);
      return null;
    }
  }, [isConnected, fetchGroceryLists]);

  // Share a grocery list with another user
  const shareGroceryList = useCallback(async (listId, listName, recipientPublicKey) => {
    if (!nostrServiceRef.current || !isConnected) {
      setError('Not connected to Nostr');
      return false;
    }
    
    try {
      await nostrServiceRef.current.shareListWithUser(listId, listName, recipientPublicKey);
      return true;
    } catch (err) {
      setError(err.message);
      console.error('Failed to share grocery list:', err);
      return false;
    }
  }, [isConnected]);

  // Update a grocery list
  const updateGroceryList = useCallback(async (listId, listName, updatedItems) => {
    if (!nostrServiceRef.current || !isConnected) {
      setError('Not connected to Nostr');
      return false;
    }
    
    try {
      await nostrServiceRef.current.updateGroceryList(listId, listName, updatedItems);
      
      // Update local state
      setGroceryLists(prev => {
        const updated = prev.map(list => {
          if (list.id === listId) {
            return { ...list, items: updatedItems, updatedAt: new Date().toISOString() };
          }
          return list;
        });
        return updated;
      });
      
      return true;
    } catch (err) {
      setError(err.message);
      console.error('Failed to update grocery list:', err);
      return false;
    }
  }, [isConnected]);

  // Remove an item from a grocery list
  const removeGroceryItem = useCallback(async (listId, listName, currentItems, itemNameToRemove) => {
    if (!nostrServiceRef.current || !isConnected) {
      setError('Not connected to Nostr');
      return null;
    }
    
    try {
      const updatedItems = await nostrServiceRef.current.removeGroceryItem(
        listId, 
        listName, 
        currentItems, 
        itemNameToRemove
      );
      
      // Update local state
      setGroceryLists(prev => {
        const updated = prev.map(list => {
          if (list.id === listId) {
            return { ...list, items: updatedItems, updatedAt: new Date().toISOString() };
          }
          return list;
        });
        return updated;
      });
      
      return updatedItems;
    } catch (err) {
      setError(err.message);
      console.error('Failed to remove grocery item:', err);
      return null;
    }
  }, [isConnected]);

  // Accept a list invite
  const acceptListInvite = useCallback(async (invite) => {
    if (!nostrServiceRef.current || !isConnected) {
      setError('Not connected to Nostr');
      return false;
    }
    
    try {
      nostrServiceRef.current.acceptListInvite(invite.listId, (items, name, updatedAt) => {
        // Update local state with the new list
        setGroceryLists(prev => {
          const exists = prev.some(list => list.id === invite.listId);
          
          if (exists) {
            // Update existing list
            return prev.map(list => {
              if (list.id === invite.listId) {
                return { ...list, items, name, updatedAt };
              }
              return list;
            });
          } else {
            // Add new list
            return [...prev, { id: invite.listId, name, items, updatedAt }];
          }
        });
      });
      
      // Remove the invite from the list
      setListInvites(prev => prev.filter(inv => inv.listId !== invite.listId));
      
      return true;
    } catch (err) {
      setError(err.message);
      console.error('Failed to accept list invite:', err);
      return false;
    }
  }, [isConnected]);

  // Decline a list invite
  const declineListInvite = useCallback((inviteId) => {
    setListInvites(prev => prev.filter(inv => inv.listId !== inviteId));
  }, []);

  // Format a public key for display
  const formatPublicKey = useCallback((key) => {
    if (!nostrServiceRef.current) return '';
    return nostrServiceRef.current.formatPublicKey(key);
  }, []);

  return {
    isConnected,
    publicKey,
    groceryLists,
    listInvites,
    error,
    createGroceryList,
    shareGroceryList,
    updateGroceryList,
    removeGroceryItem,
    acceptListInvite,
    declineListInvite,
    formatPublicKey,
    refreshLists: fetchGroceryLists
  };
};

export default useNostr;