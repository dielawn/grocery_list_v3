import { useState, useEffect } from 'react';
import './CustomItemForm.css';

export function CustomItemForm({ addCustomItem, aisleOrder }) {
    const [name, setName] = useState('');
    const [qty, setQty] = useState(1);
    const [unit, setUnit] = useState('');
    const [aisle, setAisle] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [availableAisles, setAvailableAisles] = useState([]);

    // Common units for dropdown
    const units = ['', 'oz', 'cup', 'tsp', 'TBSP', 'slice', 'can', 'package', 'lb'];

    // Use the aisleOrder prop to set available aisles
    useEffect(() => {
        if (Array.isArray(aisleOrder) && aisleOrder.length > 0) {
            setAvailableAisles(aisleOrder);
        } else {
            // Fallback if aisleOrder is not provided
            setAvailableAisles([
                'produce', 'dairy', 'freezer', 'butcher', 'baking', 
                'canned', 'condiment', 'snack', 'cheese', 'ethnic', 
                'noodle', 'cereal', 'bakery', 'nutrition', ''
            ]);
        }
    }, [aisleOrder]);

    function handleSubmit(e) {
        e.preventDefault();
        
        // Validate input
        if (!name.trim()) {
            alert('Please enter an item name');
            return;
        }

        // Create new item object
        const newItem = {
            name: name.trim(),
            qty: parseFloat(qty) || 1,
            unit,
            aisle
        };

        // Add to grocery list
        addCustomItem(newItem);
        
        // Reset form
        setName('');
        setQty(1);
        setUnit('');
        setAisle('');
        
        // Option: close form after adding item
        // setShowForm(false);
        
        console.log('Added item with aisle:', aisle);
    }

    return (
        <div className="custom-item-container">
            {!showForm ? (
                <button 
                    className="add-custom-btn"
                    onClick={() => setShowForm(true)}
                >
                    <span className="material-symbols-outlined">add</span> Add Custom Item
                </button>
            ) : (
                <div className="custom-item-form">
                    <div className="form-header">
                        <h3>Add Custom Item</h3>
                        <button 
                            className="close-btn" 
                            onClick={() => setShowForm(false)}
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    
                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="itemName">Item Name:</label>
                                <input
                                    id="itemName"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter item name"
                                    required
                                />
                            </div>
                        </div>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="itemQty">Quantity:</label>
                                <input
                                    id="itemQty"
                                    type="number"
                                    value={qty}
                                    onChange={(e) => setQty(e.target.value)}
                                    min="0.1"
                                    step="0.1"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="itemUnit">Unit:</label>
                                <select
                                    id="itemUnit"
                                    value={unit}
                                    onChange={(e) => setUnit(e.target.value)}
                                >
                                    {units.map((u) => (
                                        <option key={u} value={u}>{u}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="itemAisle">Aisle:</label>
                                <select
                                    id="itemAisle"
                                    value={aisle}
                                    onChange={(e) => setAisle(e.target.value)}
                                >
                                    <option value="">Select aisle</option>
                                    {availableAisles.map(aisleOption => (
                                        <option key={aisleOption} value={aisleOption}>
                                            {aisleOption ? aisleOption.charAt(0).toUpperCase() + aisleOption.slice(1) : 'Uncategorized'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        <div className="form-actions">
                            <button type="submit" className="add-item-btn">
                                <span className="material-symbols-outlined">add_shopping_cart</span> Add to List
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

export default CustomItemForm;