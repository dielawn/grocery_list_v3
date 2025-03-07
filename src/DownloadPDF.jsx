import '@react-pdf-viewer/core/lib/styles/index.css';
import { GeneratePDF } from './GeneratePDF';
import { PDFDownloadLink } from '@react-pdf/renderer'


export const DownloadPDF = ({ groceryList, recipeList }) => {
    const text = 'Grocery List'
    return (
        <>
        {groceryList.length > 0  && 
            <PDFDownloadLink className="material-symbols-outlined pdfLink"
              document={<GeneratePDF groceryList={groceryList} recipeList={recipeList} />}
              fileName="grocery-and-recipes.pdf">
              {({ blob, url, loading, error }) =>
                  loading ? 'Loading document...' : `download`
              }
            </PDFDownloadLink>
          }
        </>
    )
}
