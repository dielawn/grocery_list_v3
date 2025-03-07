import './DownloadInstructions.css'
export function DownloadInstructions({recipe, index}) {

    function extractName(recipe) {
        return recipe.instructions.split('/').pop().split('.pdf')[0]; 
    } 
        
    {if(recipe.instructions && recipe.instructions.endsWith('.pdf')) {
    return (
        <div key={index}>
        <a  className="flexColumn"
            href={recipe.instructions} 
            download={extractName(recipe) + ".pdf"}> 
            <span className="material-symbols-outlined">download </span> Instructions
        </a>
    </div>
    )
    }  
}
        
}