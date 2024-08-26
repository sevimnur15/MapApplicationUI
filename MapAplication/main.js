// Haritayı oluştur
var map = new ol.Map({
    target: 'map',
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM() // OpenStreetMap katmanı
        })
    ],
    view: new ol.View({
        center: ol.proj.fromLonLat([35.0, 39.0]), // Türkiye'nin koordinatları
        zoom: 7 // Zoom seviyesini ayarlama
    })
});

// Vektör kaynağını oluştur
var vectorSource = new ol.source.Vector();
var vectorLayer = new ol.layer.Vector({
    source: vectorSource
});
map.addLayer(vectorLayer);

// Nokta oluşturma işlevi
function createPoint(coordinate) {
    console.log('createPoint called with coordinate:', coordinate);

    // Eğer daha önce bir nokta varsa, onu kaldır
    if (pointFeature) {
        vectorSource.removeFeature(pointFeature);
    }

    // Yeni nokta oluştur
    pointFeature = new ol.Feature({
        geometry: new ol.geom.Point(coordinate) // Noktanın konumunu belirle
    });

    // Nokta stilini ayarla
    pointFeature.setStyle(new ol.style.Style({
        image: new ol.style.Circle({
            radius: 10, // Noktanın boyutu
            fill: new ol.style.Fill({ color: 'red' }), // Nokta rengi
            stroke: new ol.style.Stroke({ color: 'white', width: 2 }) // Nokta kenar rengi
        })
    }));

    // Noktayı içeren vektör katmanına ekle
    vectorSource.addFeature(pointFeature);
}
document.getElementById('addPointButton').addEventListener('click', function() {
    // jsPanel oluştur
    var panel = jsPanel.create({
        title: 'Add Point',
        content: '<p>Click on the map to add a point. Drag the point to move it.</p>',
        animateIn: 'jsPanelFadeIn',
        animateOut: 'jsPanelFadeOut',
        callback: function(panel) {
            panel.setStyle({
                width: '400px',
                height: '200px'
            });
        }
    });

    // Harita üzerine tıklama olayını dinle
    map.once('singleclick', function(event) {
        var coordinate = event.coordinate; // Tıklanan koordinatı al
        createPoint(coordinate); // Noktayı oluştur
        panel.close(); // Paneli kapat
    });
});





