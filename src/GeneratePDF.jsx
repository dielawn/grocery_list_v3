import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

export const GeneratePDF = ({ groceryList, recipeList }) => {
    const styles = StyleSheet.create({
        page: {
            flexDirection: 'column',
            backgroundColor: '#E4E4E4',
        },
        column: {
            flexDirection: 'column',
            width: '50%', // Assuming an even split for two columns
        },
        text: {
            padding: 10,
            margin: 2,
            fontSize: 12,
        },
        header: {
            margin: 5,
            padding: 10,
            color: 'black',
            textAlign: 'center',
            fontSize: 20,
        },
        columnsContainer: {
            flexDirection: 'row',
        },
    });

    // Split the grocery list into two columns
    const midPoint = Math.ceil(groceryList.length / 2);
    const firstColumnItems = groceryList.slice(0, midPoint);
    const secondColumnItems = groceryList.slice(midPoint);

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <Text style={styles.header}>Grocery List</Text>
                <View style={styles.columnsContainer}>
                    <View style={styles.column}>
                        {firstColumnItems.map((ingredient, index) => (
                            <Text key={`ingredient-1-${index}`} style={styles.text}>
                                {parseFloat(ingredient.qty.toFixed(2))} {ingredient.unit} {ingredient.name}
                            </Text>
                        ))}
                    </View>
                    <View style={styles.column}>
                        {secondColumnItems.map((ingredient, index) => (
                            <Text key={`ingredient-2-${index}`} style={styles.text}>
                                {parseFloat(ingredient.qty.toFixed(2))} {ingredient.unit} {ingredient.name}
                            </Text>
                        ))}
                    </View>
                </View>
                <Text style={styles.header}>Recipes</Text>
                {recipeList.map((recipe, index) => (
                    <Text key={`recipe-${index}`} style={styles.text}>{recipe}</Text>
                ))}
            </Page>
        </Document>
    );
};
