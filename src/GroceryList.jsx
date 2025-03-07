import './GroceryList.css'

export function GroceryList({groceryList, setGroceryList, recipeList}) {

    function removeItem(itemName) {
        //create a new array excluding itemName
        const newList = groceryList.filter(item => item.name !== itemName)
        setGroceryList(newList)
    }
     
    return (
        <div >
            <h3>Grocery List: {groceryList.length} items {recipeList.length} Recipes.</h3>
            {groceryList.map((item, index) => (
                <div  key={index} className='underLine groceryList'>
                    <p >{parseFloat(item.qty.toFixed(2))} {item.unit}</p>
                    <p className='txtPad'>{item.name}</p>
                    <button className='removeBtn' onClick={() => removeItem(item.name)}>❌</button>
                </div>
            ))}
        </div>
    )
}