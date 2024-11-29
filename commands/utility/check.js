const { SlashCommandBuilder } = require('discord.js');
const { client_token_helloasso } = require('../../config.json');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

async function getEvolPrice() {
    const url = 'https://api.helloasso.com/v5/organizations/atstri/forms/Shop/merch-et-goodies-2025/payments?pageIndex=1&pageSize=20';
    const options = {
        method: 'GET',
        headers: {
            accept: 'application/json',
            authorization: `Bearer ${client_token_helloasso}`
        }
    };

    try {
        // Requête vers l'API
        const response = await fetch(url, options);

        // Vérification du statut de la réponse
        if (!response.ok) {
            throw new Error(`Erreur HTTP ! Statut : ${response.status}`);
        }

        // Analyse de la réponse JSON
        const jsonData = await response.json();
        const orders = jsonData.data;

        // Vérifier si des commandes ont été reçues
        if (!orders || orders.length === 0) {
            console.log("Aucune commande trouvée.");
            return {};
        }

        // Regroupe chaque commande par jour et cumule le prix total par jour
        const dateTotals = {};

        // Calculer les totaux pour chaque date
        orders.forEach(order => {
            const orderDate = new Date(order.date).toISOString().split("T")[0]; // Extraire la date au format YYYY-MM-DD
            const amount = order.amount / 100; // Convertir en euros (montant en centimes)

            if (!dateTotals[orderDate]) {
                dateTotals[orderDate] = 0;
            }
            dateTotals[orderDate] += amount;
        });

        return dateTotals; // Retourne les données agrégées
    } catch (error) {
        console.error("Erreur lors de la récupération des données :", error.message);
        return {}; // Retourne un objet vide en cas d'erreur
    }
}

// Fonction qui crée un graphique à partir des données
async function createGraphic(data) {
    try {
        const width = 800; // Largeur du graphique
        const height = 400; // Hauteur du graphique
        const backgroundColour = 'white';

        const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour });

        // Trier les données par ordre croissant de date
        const sortedData = Object.entries(data).sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB));
        const sortedLabels = sortedData.map(([date]) => date); // Dates triées
        const sortedValues = sortedData.map(([_, value]) => value); // Valeurs correspondantes

        const configuration = {
            type: 'bar',
            data: {
                labels: sortedLabels, // Dates triées
                datasets: [{
                    label: 'Montant total (€)',
                    data: sortedValues, // Montants triés
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgb(54, 162, 235)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        };

        const image = await chartJSNodeCanvas.renderToBuffer(configuration);
        return image;
    } catch (error) {
        console.error("Erreur lors de la création du graphique :", error.message);
        throw error;
    }
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName('check-shop')
        .setDescription('Renvoie une image d\'un graphique de l\'historique des commandes'),
    async execute(interaction) {
        try {
            const data = await getEvolPrice();

            // Vérifie si les données sont disponibles
            if (!data || Object.keys(data).length === 0) {
                await interaction.reply("Aucune donnée disponible pour générer le graphique.");
                return;
            }

            const image = await createGraphic(data);

            // Réponse avec le graphique
            await interaction.reply({ files: [{ attachment: image, name: 'historique_commandes.png' }] });
        } catch (error) {
            console.error("Erreur lors de l'exécution de la commande :", error.message);
            await interaction.reply("Une erreur s'est produite lors de la génération du graphique.");
        }
    },
};
