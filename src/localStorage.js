function saveToLocalStorage(groceryList, recipeList) {
    localStorage.clear()
    groceryList.forEach((item, index) => {
        let itemKey = `ingredient${index}`;
        let itemValue = JSON.stringify({
            name: item.name, 
            qty: item.qty, 
            unit: item.unit, 
            aisle: item.aisle 
        })
        localStorage.setItem(itemKey, itemValue)
    })
    recipeList.forEach((item, index) => {
        let itemKey = `recipe${index}`
        let itemValue = JSON.stringify(item)
        localStorage.setItem(itemKey, itemValue)
    })
}

function loadFromLocalStorage(loadedGroceryList, loadedRecipeList) {
    
    for (let i = 0; true; i++) {
      const itemValue = localStorage.getItem(`ingredient${i}`)
      if (!itemValue) break;
      loadedGroceryList.push(JSON.parse(itemValue))
    }
    
    for (let i = 0; true; i++) {
      const itemValue = localStorage.getItem(`recipe${i}`)
      if (!itemValue) break;
      loadedRecipeList.push(JSON.parse(itemValue))
    }

}

export {
    saveToLocalStorage,
    loadFromLocalStorage,

}