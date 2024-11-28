const { Events } = require('discord.js');
const { client_token_helloasso, salon_id } = require('../config.json');

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

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
        // Récupérer les informations du shop
        let latestOrder = await getInfoShop();
        setInterval(async () => {
            let newOrder = await getInfoShop();
            //comparer les deux objets JSON
            if (JSON.stringify(latestOrder) !== JSON.stringify(newOrder)) {
                // si les objets sont différents, mettre à jour la dernière commande
                latestOrder = newOrder;
                // envoyer un message dans un salon
                const channel = client.channels.cache.get(salon_id);
                channel.send('Nouvelle commande !');
            } else {
                console.log('Pas de nouvelle commande');
            }
        }, 5 * 60 * 1000); // 5 minutes en millisecondes
	},
};