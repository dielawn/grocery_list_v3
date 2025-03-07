import './Search.css'
import { useEffect, useState } from "react";
import recipes from './recipes'

function SearchRecipes({ matchingRecipes, setMatchingRecipes, keyword, setKeyword}) {
    const [message, setMessage] = useState('')
    
    function search() {        

        if (keyword === '') return;
        const prevMatches = [...matchingRecipes]
        const newMatches = recipes.filter(recipe =>
            recipe.name?.toLowerCase().includes(keyword.toLowerCase()) ||
            (Array.isArray(recipe.ingredients) && recipe.ingredients.some(item => item.name?.toLowerCase().includes(keyword.toLowerCase()))) ||
            (Array.isArray(recipe.keyword) && recipe.keyword.some(word => word.trim().toLowerCase() === keyword.toLowerCase()))
        )
        
        if (newMatches.length === 0) {
            setMessage(`No matching recipes with "${keyword}"`)
        } else {
            setMessage(`${newMatches.length} Recipes containing "${keyword}"`)
        }
        setMatchingRecipes([...prevMatches, ...newMatches.map(({ name, ingredients, image, instructions, link }) => ({ name, ingredients, image, instructions, link }))])
    }
//keywords 
    useEffect(() => {
        setMatchingRecipes([])
        setMessage('')
    }, [keyword])

    function handleClear() {
        setMatchingRecipes([])
        handleKeyword('')
        setMessage('')
    }

    return (
        <div className='searchDiv'>
            <label className="labelTxt" htmlFor="searchInput">               
                <input 
                    id="searchInput"
                    className="searchInput"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    />
            </label>
            <div className="searchBtnsDiv">
            <button onClick={() => search()}><span className='material-symbols-outlined'>search</span></button>
            <button onClick={() => handleClear()}>Clear</button>
            </div>
            <div>
                <h3>{message !== '' && message}</h3>
            </div>
        </div>
    )
}


export {
    SearchRecipes,
    
}