import './ServingSelect.css'
import { useState, useEffect } from "react";

export function ServingSizeSelect({setServingSize, servingSize, groceryList, setGroceryList}) {
    const [prevServingSize, setPrevServingSize] = useState(servingSize)
    const options = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

    function handleChange(event) {
        setServingSize(Number(event.target.value))
    }

    useEffect(() => {

        if (groceryList.length > 0) {
            //calculate the adjustment factor based on the new serving size relative to the default serving size
            const adjustmentFactor = servingSize / prevServingSize    
            const adjustedIngredients = groceryList.map(item => {
                return {
                    ...item,
                    //adjust each item's qty by the adjustment factor
                    qty: item.qty * adjustmentFactor,
                }
            })
            setGroceryList(adjustedIngredients)
            setPrevServingSize(servingSize)
        } 
    }, [servingSize])
    
    

    return (
        <label className="servingSelect" htmlFor="servingSelect">Serving Size: {' '}
        <select id="servingSelect" value={servingSize} onChange={handleChange}>
            {options.map(num => (
                <option key={num} value={num}>{num}</option>
            ))}
        </select>
        </label>
    )
}