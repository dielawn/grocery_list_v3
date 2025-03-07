import './RecipeList.css'
import { useState } from "react";
import { DownloadInstructions } from './DownloadInstructions'


function SelectedRecipeList({recipeList}) {
    
    return (
        <div>
            <h3>Selected Recipes</h3>
            {recipeList.map((recipe, index) => (
                <p key={index}>{recipe}</p>
            )) }
        </div>
    )
}


function RecipesList({addToLists, recipeList, list}) {
    const [toggleStates, setToggleStates] = useState([])

    function scroll(recipeName, direction) {
        setToggleStates(prevStates => ({
            ...prevStates,
            [recipeName]: direction === 'right' ? false : true,
        }))
    }
    
    return (
        <>
         {list.map((recipe, recipeIndex) => (
            <div key={recipe.name} className='recipeCard'>
              
               <h3>{recipe.name}</h3> 
               {recipeList.map((item, index) => (
                  item === recipe.name ? <div key={index} className='inListTxt'>✅</div> : null
                ))}   

        {toggleStates[recipe.name] !== false ? (
                <>
                    <img className='recipeImg' src={recipe.image} alt={recipe.name} /><br></br>    
                    <button onClick={() => scroll(recipe.name, 'right')} className="scrollRight"><span className="material-symbols-outlined">chevron_right</span></button>
                </>
            ) : (
                <>
                    {recipe.ingredients.map((item, index) => (
                        <p key={index}>{item.qty} {item.unit} {item.name}</p>
                    ))}
                    <button onClick={() => scroll(recipe.name, 'left')} className="scrollLeft"><span className="material-symbols-outlined">chevron_left</span></button>
                </>
            )}               
               <button onClick={() => addToLists(recipe.ingredients, recipe.name)}>Add {recipe.name.length > 15 ? (`${recipe.name.slice(0, 15)}...`) : (recipe.name)}</button>
                <DownloadInstructions recipe={recipe} index={recipeIndex} />
            </div>
          ))}
        </>
       
    )
}

export{
    SelectedRecipeList,
    RecipesList,
}