// Complete NostrGroceryList.jsx with QR Scan Menu Button
import React, { useState, useEffect } from 'react';
import useNostr from './useNostr';
import NostrDebug from './NostrDebug';
import SimplifiedCameraTest from './SimplifiedCameraTest';
import IntegratedQRScanner from './IntegratedQRScanner';
import './NostrGroceryList.css';

const NostrGroceryList = ({ currentGroceryList, setGroceryList, recipeList }) => {
  // State for menu visibility
  const [isMenuVis, setIsMenuVis] = useState(false);

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
    formatPublicKey,
    updateGroceryList
  } = useNostr();

  const [activeListId, setActiveListId] = useState(null);
  const [shareWithKey, setShareWithKey] = useState('');
  const [showShareForm, setShowShareForm] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [showCameraTest, setShowCameraTest] = useState(false);

  // Initialize or sync with Nostr on load
  useEffect(() => {
    const initializeNostrList = async () => {
      console.log("Initializing Nostr list...");
      console.log("Current grocery list:", currentGroceryList);
      console.log("Available Nostr lists:", groceryLists);
      
      // If we have grocery items and no active Nostr list, create one
      if (currentGroceryList?.length > 0 && !activeListId && groceryLists?.length === 0) {
        console.log("Creating new list with items:", currentGroceryList);
        const newListId = await createGroceryList('My Grocery List', currentGroceryList);
        if (newListId) {
          setActiveListId(newListId);
          setStatusMessage('Created new shared list');
        }
      } else if (groceryLists?.length > 0 && !activeListId) {
        // Use the most recently updated list as the active list
        console.log("Using existing list:", groceryLists[0]);
        setActiveListId(groceryLists[0].id);
        
        // Only override local grocery list if the user has no items
        if (!currentGroceryList || currentGroceryList.length === 0) {
          console.log("Overriding empty grocery list with Nostr list items:", groceryLists[0].items);
          if (groceryLists[0].items && Array.isArray(groceryLists[0].items)) {
            setGroceryList(groceryLists[0].items);
            setStatusMessage(`Loaded shared list: ${groceryLists[0].name}`);
          }
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
  }, [isConnected, currentGroceryList, groceryLists, activeListId, createGroceryList, setGroceryList, updateGroceryList]);

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
    console.log('Scanned key:', scannedKey);
    
    // Find the active list
    const activeList = groceryLists.find(list => list.id === activeListId);
    if (!activeList) {
      setStatusMessage('No active list found to share.');
      return;
    }
    
    const success = await shareGroceryList(activeListId, activeList.name, scannedKey);
    
    if (success) {
      setStatusMessage(`List shared with user: ${formatPublicKey(scannedKey)}`);
      setShowQRScanner(false); // Hide QR component after successful share
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

  // Close all panels
  const closeAllPanels = () => {
    setShowDebugPanel(false);
    setShowCameraTest(false);
    setShowQRScanner(false);
  };

  // Toggle menu visibility
  const toggleMenu = () => {
    setIsMenuVis(!isMenuVis);
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
        
        <div className="public-key">
          <span>Your ID: <code>{formatPublicKey(publicKey)}</code></span>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          {/* Debug toggle button */}
          <button 
            onClick={() => {
              closeAllPanels();
              setShowDebugPanel(!showDebugPanel);
            }} 
            style={{
              backgroundColor: showDebugPanel ? '#f44336' : '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            {showDebugPanel ? 'Hide Debug' : 'Debug Tools'}
          </button>
          
          {/* Camera test toggle button */}
          <button 
            onClick={() => {
              closeAllPanels();
              setShowCameraTest(!showCameraTest);
            }} 
            style={{
              backgroundColor: showCameraTest ? '#f44336' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            {showCameraTest ? 'Hide Camera Test' : 'Camera Test'}
          </button>
          
          {/* QR Code toggle button */}
          <button 
            onClick={() => {
              closeAllPanels();
              setShowQRScanner(!showQRScanner);
            }} 
            style={{
              backgroundColor: showQRScanner ? '#f44336' : '#9c27b0',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            {showQRScanner ? 'Hide QR Code' : 'QR Code'}
          </button>
        </div>
      </div>

      {/* Debug panel (conditionally rendered) */}
      {showDebugPanel && <NostrDebug />}
      
      {/* Camera test panel (conditionally rendered) */}
      {showCameraTest && <SimplifiedCameraTest />}

      {statusMessage && (
        <div className="status-message">
          {statusMessage}
          <button 
            className="close-btn"
            onClick={() => setStatusMessage('')}
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="error-message">
          Error: {error}
          <button 
            className="close-btn"
            onClick={() => setStatusMessage('')}
          >
            ×
          </button>
        </div>
      )}
      
      {/* Integrated QR Scanner */}
      {showQRScanner && (
        <IntegratedQRScanner onShareWithKey={handleShareViaQR} />
      )}

      {listInvites && listInvites.length > 0 && (
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
                  onClick={() => {
                    closeAllPanels();
                    setShowQRScanner(!showQRScanner);
                  }}
                >
                  Scan QR Code
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Menu item for QR code scanning */}
      {isMenuVis && (
        <button 
          className="menuItem"
          onClick={() => {
            closeAllPanels();
            setShowQRScanner(!showQRScanner);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <span className="material-symbols-outlined">qr_code_scanner</span>
          QR Code
        </button>
      )}

      {groceryLists && groceryLists.length > 0 && (
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
              if (selectedList && selectedList.items && Array.isArray(selectedList.items)) {
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
        
        {Array.isArray(currentGroceryList) && currentGroceryList.length > 0 ? (
          currentGroceryList.map((item, index) => (
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
          ))
        ) : (
          <div className="empty-list">
            <p>Your grocery list is empty.</p>
          </div>
        )}
      </div>

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