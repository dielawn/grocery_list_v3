// Updated NostrGroceryList.jsx to include the QR code component
import React, { useState, useEffect } from 'react';
import useNostr from './useNostr';
import NostrQRCode from './NostrQRCode';
import './NostrGroceryList.css';

const NostrGroceryList = ({ currentGroceryList, setGroceryList, recipeList }) => {
  const {
    isConnected,
    publicKey,
    groceryLists,
    listInvites,
    error,
    createGroceryList,
    shareGroceryList,
    removeGroceryItem,
    acceptListInvite,
    declineListInvite,
    formatPublicKey
  } = useNostr();

  const [activeListId, setActiveListId] = useState(null);
  const [shareWithKey, setShareWithKey] = useState('');
  const [showShareForm, setShowShareForm] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);

  // Initialize or sync with Nostr on load
  useEffect(() => {
    const initializeNostrList = async () => {
      console.log("Initializing Nostr list...");
      console.log("Current grocery list:", currentGroceryList);
      console.log("Available Nostr lists:", groceryLists);
      
      // If we have grocery items and no active Nostr list, create one
      if (currentGroceryList.length > 0 && !activeListId && groceryLists.length === 0) {
        console.log("Creating new list with items:", currentGroceryList);
        const newListId = await createGroceryList('My Grocery List', currentGroceryList);
        if (newListId) {
          setActiveListId(newListId);
        }
      } else if (groceryLists.length > 0 && !activeListId) {
        // Use the most recently updated list as the active list
        console.log("Using existing list:", groceryLists[0]);
        setActiveListId(groceryLists[0].id);
        
        // Only override local grocery list if the user has no items
        if (currentGroceryList.length === 0) {
          console.log("Overriding empty grocery list with Nostr list items:", groceryLists[0].items);
          setGroceryList(groceryLists[0].items);
          setStatusMessage(`Loaded shared list: ${groceryLists[0].name}`);
        } else {
          // Update the Nostr list with current items instead of replacing
          console.log("Updating Nostr list with current items:", currentGroceryList);
          await updateGroceryList(groceryLists[0].id, groceryLists[0].name, currentGroceryList);
          setStatusMessage(`Updated shared list: ${groceryLists[0].name} with your items`);
        }
      }
    };

    if (isConnected) {
      initializeNostrList();
    }
  }, [isConnected, currentGroceryList, groceryLists, activeListId, createGroceryList, setGroceryList]);

  // Handle item removal that syncs with Nostr
  const handleRemoveItem = async (itemName) => {
    if (!activeListId) return;
    
    // Find the active list
    const activeList = groceryLists.find(list => list.id === activeListId);
    if (!activeList) return;
    
    if (!Array.isArray(currentGroceryList)) {
      console.error("currentGroceryList is not an array:", currentGroceryList);
      return;
    }
    
    // Remove item via Nostr
    const updatedItems = await removeGroceryItem(
      activeListId,
      activeList.name,
      currentGroceryList,
      itemName
    );
    
    if (updatedItems) {
      // Update local state
      setGroceryList(updatedItems);
      setStatusMessage(`Removed ${itemName} and synced with other users`);
    }
  };

  // Handle sharing a list with another user
  const handleShareList = async (e) => {
    if (e) e.preventDefault();
    
    if (!shareWithKey || !activeListId) return;
    
    // Find the active list
    const activeList = groceryLists.find(list => list.id === activeListId);
    if (!activeList) return;
    
    const success = await shareGroceryList(activeListId, activeList.name, shareWithKey);
    
    if (success) {
      setStatusMessage(`List shared with user: ${formatPublicKey(shareWithKey)}`);
      setShareWithKey('');
      setShowShareForm(false);
    } else {
      setStatusMessage('Failed to share list. Check the public key and try again.');
    }
  };

  // Handle sharing via QR code scan
  const handleShareViaQR = async (scannedKey) => {
    if (!scannedKey || !activeListId) {
      setStatusMessage('No valid key found or no active list selected.');
      return;
    }
    
    setShareWithKey(scannedKey);
    
    // Find the active list
    const activeList = groceryLists.find(list => list.id === activeListId);
    if (!activeList) {
      setStatusMessage('No active list found to share.');
      return;
    }
    
    const success = await shareGroceryList(activeListId, activeList.name, scannedKey);
    
    if (success) {
      setStatusMessage(`List shared with user: ${formatPublicKey(scannedKey)}`);
      setShowQRCode(false); // Hide QR component after successful share
    } else {
      setStatusMessage('Failed to share list. Check the public key and try again.');
    }
  };

  // Handle accepting a list invite
  const handleAcceptInvite = async (invite) => {
    const success = await acceptListInvite(invite);
    
    if (success) {
      setActiveListId(invite.listId);
      setStatusMessage(`Accepted invitation to list: ${invite.listName}`);
    } else {
      setStatusMessage('Failed to accept list invitation');
    }
  };

  return (
    <div className="nostr-grocery-list">
      <div className="nostr-status">
        <div className="connection-status">
          {isConnected ? (
            <span className="connected">Connected to Nostr</span>
          ) : (
            <span className="disconnected">Disconnected from Nostr</span>
          )}
        </div>
        
      
       
      </div>

      {statusMessage && (
        <div className="status-message">
          {statusMessage}
        
        </div>
      )}

      {error && (
        <div className="error-message">
          Error: {error}
          <button 
            className="close-btn"
            onClick={() => setError('')}
          >
            ×
          </button>
        </div>
      )}
      
      {showQRCode && (
        <NostrQRCode onShareWithKey={handleShareViaQR} />
      )}

      {listInvites.length > 0 && (
        <div className="invites-section">
          <h4>List Invitations</h4>
          <ul className="invite-list">
            {listInvites.map(invite => (
              <li key={invite.listId} className="invite-item">
                <span>{invite.listName}</span> from <span>{formatPublicKey(invite.senderPublicKey)}</span>
                <div className="invite-actions">
                  <button onClick={() => handleAcceptInvite(invite)}>Accept</button>
                  <button onClick={() => declineListInvite(invite.listId)}>Decline</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeListId && (
        <div className="sharing-section">
          <button 
            className="share-btn"
            onClick={() => setShowShareForm(!showShareForm)}
          >
            {showShareForm ? 'Cancel Sharing' : 'Share This List'}
          </button>
          
          {showShareForm && (
            <form onSubmit={handleShareList} className="share-form">
              <label htmlFor="shareWithKey">
                Recipient's Public Key:
                <input
                  type="text"
                  id="shareWithKey"
                  value={shareWithKey}
                  onChange={(e) => setShareWithKey(e.target.value)}
                  placeholder="npub1..."
                  required
                />
              </label>
              <div className="share-form-actions">
                <button type="submit" className="share-submit-btn">Share List</button>
                <button 
                  type="button" 
                  className="share-qr-btn"
                  onClick={() => setShowQRCode(!showQRCode)}
                >
                  {showQRCode ? 'Hide QR Code' : 'Share via QR Code'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {groceryLists.length > 0 && (
        <div className="list-selector">
          <label htmlFor="active-list">Active Shared List:</label>
          <select 
            id="active-list"
            value={activeListId || ''}
            onChange={(e) => {
              const newActiveId = e.target.value;
              setActiveListId(newActiveId);
              
              // Find the selected list and update local grocery items
              const selectedList = groceryLists.find(list => list.id === newActiveId);
              if (selectedList) {
                setGroceryList(selectedList.items);
                setStatusMessage(`Switched to list: ${selectedList.name}`);
              }
            }}
          >
            <option value="">Select a list...</option>
            {groceryLists.map(list => (
              <option key={list.id} value={list.id}>
                {list.name} ({new Date(list.updatedAt).toLocaleString()})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grocery-list-container">
        <h3>Grocery List: {Array.isArray(currentGroceryList) ? currentGroceryList.length : 0} items {Array.isArray(recipeList) ? recipeList.length : 0} Recipes</h3>
        
        {Array.isArray(currentGroceryList) && currentGroceryList.map((item, index) => (
          <div key={index} className="grocery-item underLine groceryList">
            <p>{parseFloat(item.qty.toFixed(2))} {item.unit}</p>
            <p className="txtPad">{item.name}</p>
            <button 
              className="removeBtn" 
              onClick={() => handleRemoveItem(item.name)}
            >
              ❌
            </button>
          </div>
        ))}
      </div>

      {!currentGroceryList || (Array.isArray(currentGroceryList) && currentGroceryList.length === 0) && (
        <div className="empty-list">
          <p>Your grocery list is empty.</p>
        </div>
      )}

      {activeListId && isConnected && (
        <div className="sync-status">
          <span className="sync-icon">⚡</span>
          <span>List is synced with Nostr</span>
        </div>
      )}
    </div>
  );
};

export default NostrGroceryList;