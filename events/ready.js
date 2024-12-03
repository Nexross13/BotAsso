const { Events } = require('discord.js');
const { client_secret_helloasso, client_id_helloasso, client_token_helloasso, salon_id } = require('../config.json');

async function getInfoShop() {
    const url = 'https://api.helloasso.com/v5/organizations/atstri/forms/Shop/merch-et-goodies-2025/payments?pageIndex=1&pageSize=20';
    const options = {
        method: 'GET',
        headers: {
            accept: 'application/json',
            authorization: 'Bearer ' + client_token_helloasso
        }
    };

    // reponse api dans une variable
    let response = await fetch(url, options);
    let jsonData = await response.json();
    const orders = jsonData.data;

    return orders;
}

async function compareInfoShop(oldHistory, newHistory) {
    if (JSON.stringify(oldHistory) !== JSON.stringify(newHistory)) {
        const orders1 = new Set(oldHistory.data.map(order => order.order.id));
        const newOrders = newHistory.data.filter(order => !orders1.has(order.order.id));

        // Créer un dictionnaire pour associer les IDs des produits à leurs noms
        const itemMap = {};
        items.data.forEach(item => {
            itemMap[item.id] = item.name;
        });

        // Calculer le total détaillé par produit
        const productQuantities = {};

        newOrders.forEach(order => {
            order.items.forEach(item => {
                const productName = itemMap[item.id] || `Produit ID ${item.id}`; // Nom du produit ou ID si non trouvé
                const quantity = 1; // Chaque ligne représente 1 unité
            
                if (!productQuantities[productName]) {
                    productQuantities[productName] = 0;
                }
                productQuantities[productName] += quantity;
            });
        });

        const channel = client.channels.cache.get(salon_id);
        channel.send('## Nouvelle commande !');
        Object.entries(productQuantities).forEach(([productName, total]) => {
            channel.send(`${productName} : ${total}`);
        });
        return true;
    } else {
        console.log('Pas de nouvelle commande');
        return false;
    }
}

async function getNewToken() {
    const encodedParams = new URLSearchParams();
    encodedParams.set('grant_type', 'client_credentials');
    encodedParams.set('client_id', client_id_helloasso);
    encodedParams.set('client_secret', client_secret_helloasso);

    const url = 'https://api.helloasso.com/oauth2/token';
    const options = {
        method: 'POST',
        headers: {
            accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: encodedParams
    };

    // reponse api dans une variable
    let response = await fetch(url, options);
    let jsonData = await response.json();
    let token = jsonData.access_token;
    let refreshToken = jsonData.refresh_token;
    updateConfig(token, refreshToken);
}

async function refreshToken() {
    const config = require('../config.json');
    const encodedParams = new URLSearchParams();
    encodedParams.set('grant_type', 'refresh_token');
    encodedParams.set('client_id', client_id_helloasso);
    encodedParams.set('refresh_token', config.refresh_token_helloasso);

    const url = 'https://api.helloasso.com/oauth2/token';
    const options = {
        method: 'POST',
        headers: {
            accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: encodedParams
    };

    // reponse api dans une variable
    let response = await fetch(url, options);
    let jsonData = await response.json();
    let token = jsonData.access_token;
    let refreshToken = jsonData.refresh_token;
    console.log('Nouveau token');

    updateConfig(token, refreshToken);
}

async function updateConfig(token, refresh_token) {
    const fs = require('fs');
    const config = require('../config.json');
    config.client_token_helloasso = token;
    config.refresh_token_helloasso = refresh_token;
    fs.writeFile('./config.json', JSON.stringify(config, null, 2), (err) => {
        if (err) {
            console.log('Erreur lors de la mise à jour du fichier config.json');
        } else {
            console.log('Fichier config.json mis à jour');
        }
    });
}

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
        getNewToken();
        console.log('Token récupéré');
        // Récupérer les informations du shop
        let latestOrder;
        let newOrder;
        
        try {
            latestOrder = await getInfoShop();
            console.log('Informations du shop récupérées');
        } catch (error) {
            console.error('Erreur lors de la récupération des informations du shop :', error);
        }
        setInterval(async () => {
            try {
                newOrder = await getInfoShop();
                console.log('Nouvelles informations du shop récupérées !');
            } catch (error) {
                console.error('Erreur lors de la récupération des informations du shop :', error);
            }
            //comparer les deux objets JSON
            if(compareInfoShop(latestOrder, newOrder)) {
                latestOrder = newOrder;
            }
            refreshToken();
        }, 15 * 60 * 1000); // 15 minutes en millisecondes
	},
};