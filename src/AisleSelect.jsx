import './AisleSelect.css'
import { useEffect, useState } from 'react'

export function AisleSelect({aisleOrder, setAisleOrder, sortList }) {
    
    const [selectedAisle, setSelectedAisle] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const aisles = ['dairy', 'freezer', 'cheese', 'snack', 'butcher', 'ethnic', 'noodle',  'canned', 'baking', 'cereal', 'condiment', 'bakery', 'produce', 'nutrition', '']
    const setAisle = (e) => {
        setSelectedAisle(e.target.value)
    }

    const setIndex = (e) => {
        setSelectedIndex(parseInt(e.target.value, 10))
    }

    function getIndex(searchItem) {
       return aisleOrder.indexOf(searchItem)
    }



    function updateAisleOrder() {

        const newOrder = [...aisleOrder]
        newOrder.splice(getIndex(selectedAisle), 1)
        newOrder.splice(selectedIndex, 0, selectedAisle)
        setAisleOrder(newOrder)
        sortList()
    }

    return (
        <div>
            <select value={selectedAisle} onChange={setAisle}>
                {aisleOrder.map((aisle, index) => (
                    <option key={index} value={aisle}>{aisle}</option>
                ))}
            </select>
            <select value={selectedIndex} onChange={setIndex}>
                {Array.from({length: aisleOrder.length}, (_, i) => i).map(index => (
                    <option key={index} value={index}>{index + 1}</option>
                ))}
            </select>
            <button onClick={() => updateAisleOrder()}>Update Order</button>
        </div>
    )
}