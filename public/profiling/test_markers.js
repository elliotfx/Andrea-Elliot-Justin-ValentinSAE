// Test simple pour vérifier si les markers Leaflet s'affichent
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(() => {
        const map = window.map || L.map('city-map').setView([46.3236, -0.4600], 9);

        // Ajouter un marker de test rouge sur Niort
        const testMarker = L.marker([46.3236, -0.4600], {
            icon: L.icon({
                icon Url: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            })
        }).addTo(map);

        testMarker.bindPopup('<b>MARKER DE TEST!</b><br>Si vous voyez ceci, les markers marchent!');
        console.log('🔴 MARKER DE TEST AJOUTÉ SUR NIORT');

        // Test d'un cercle TRÈS petit
        const tinyCircle = L.circle([46.4, -0.5], {
            color: 'red',
            fillColor: 'red',
            fillOpacity: 0.9,
            radius: 1000, // Seulement 1km
            weight: 5
        }).addTo(map);
        console.log('🔴 PETIT CERCLE DE TEST (1km) AJOUTÉ');
    }, 1000);
});
