const wktFormat = new ol.format.WKT();
// Haritayı oluşturma
const raster = new ol.layer.Tile({
    source: new ol.source.OSM(),
});

const vector = new ol.layer.Vector({
    source: new ol.source.Vector(),
    style: new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(255, 255, 255, 0.2)',
        }),
        stroke: new ol.style.Stroke({
            color: '#ffcc33',
            width: 2,
        }),
        image: new ol.style.Circle({
            radius: 7,
            fill: new ol.style.Fill({
                color: '#ffcc33',
            }),
        }),
    }),
});

const map = new ol.Map({
    layers: [raster, vector],
    target: 'map',
    view: new ol.View({
        center: ol.proj.fromLonLat([35.0, 39.0]),
        zoom: 7,
    }),
});

// Seçme ve düzenleme etkileşimlerini başlatma
const ExampleModify = {
    init: function () {
        this.select = new ol.interaction.Select();
        map.addInteraction(this.select);

        this.modify = new ol.interaction.Modify({
            features: this.select.getFeatures(),
        });
        map.addInteraction(this.modify);

        this.setEvents();
    },
    setEvents: function () {
        const selectedFeatures = this.select.getFeatures();

        this.select.on('change:active', function () {
            selectedFeatures.clear(); // Seçilen özellikleri temizle
        });

        // Seçim yapıldığında jsPanel'i aç
        this.select.on('select', function (event) {
            if (event.selected.length > 0) {
                jsPanel.create({
                    content: '<h2>Selected Feature</h2><p>You have selected a feature!</p>',
                    animateIn: 'jsPanelFadeIn',
                    position: 'center-top',
                    headerTitle: 'Feature Info',
                });
            }
        });
    },
    setActive: function (active) {
        this.select.setActive(active);
        this.modify.setActive(active);
    },
};
ExampleModify.init();

const ExampleDraw = {
    init: function () {
        this.addInteractions(); // Etkileşimleri ekle
    },
    addInteractions: function () {
        const interactionTypes = ['Point', 'LineString', 'Polygon']; // Circle'ı kaldırdık
        
        interactionTypes.forEach(type => {
            const interaction = new ol.interaction.Draw({
                source: vector.getSource(),
                type: type,
            });
            this[type] = interaction;
            map.addInteraction(interaction);

            // Çizim tamamlandığında paneli aç
            interaction.on('drawend', (event) => this.onDrawEnd(event, type));
            interaction.setActive(false); // Başlangıçta aktif değil
        });
    },
    onDrawEnd: function (event, type) {
        const coordinates = event.feature.getGeometry().getCoordinates();
        const wkt = this.convertToWKT(type, coordinates); // Koordinatları WKT formatına dönüştür
        
        jsPanel.create({
            content: `
                <h2>COORDİNATES</h2>
                <p><strong>WKT:</strong> ${wkt}</p>
                <input type="text" id="nameInput" placeholder="Enter Name" />
                <button id="saveButton">SAVE</button>
            `,
            animateIn: 'jsPanelFadeIn',
            position: 'center',
            headerTitle: `${type} Added`,
        });

        // SAVE butonuna tıklama olayı
        document.getElementById('saveButton').onclick = () => {
            const name = document.getElementById('nameInput').value;
            fetch("https://localhost:7245/api/Home/addWKT", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json', // Gönderilen verinin tipi
                },
                body: JSON.stringify({ wkt: wkt, name: name }) // JSON formatında veri gönderimi
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json(); // JSON formatında yanıt döner
            })
            .then(data => {
                alert(`Saved: ${data.message}`);
            })
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error);
            });
        };
    },
    convertToWKT: function (type, coordinates) {
        switch (type) {
            case 'Point':
                return `POINT(${coordinates[0]} ${coordinates[1]})`;
            case 'LineString':
                return `LINESTRING(${coordinates.map(coord => `${coord[0]} ${coord[1]}`).join(', ')})`;
            case 'Polygon':
                return `POLYGON((${coordinates[0].map(coord => `${coord[0]} ${coord[1]}`).join(', ')}))`;
            default:
                return '';
        }
    },
    setActive: function (active) {
        Object.values(this).forEach(interaction => {
            if (interaction instanceof ol.interaction.Draw) {
                interaction.setActive(false);
            }
        });
        
        if (active) {
            const type = document.querySelector('.dropdown-content a.active')?.getAttribute('data-value');
            if (type) {
                this[type].setActive(true);
            }
        }
    },
};

ExampleDraw.init();

const snap = new ol.interaction.Snap({
    source: vector.getSource(),
});
map.addInteraction(snap);

// Dropdown menü olayları
document.addEventListener('DOMContentLoaded', function () {
    const dropdownLinks = document.querySelectorAll('.dropdown-content a');
    
    dropdownLinks.forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            dropdownLinks.forEach(link => link.classList.remove('active')); // Tüm linklerin aktif sınıfını kaldır
            this.classList.add('active'); // Tıklanan linke aktif sınıfını ekle
            
            const drawType = this.getAttribute('data-value');
            ExampleDraw.setActive(false);  // Mevcut çizimi durdur
            ExampleModify.setActive(false);  // Düzenlemeyi durdur
            
            ExampleDraw.setActive(true);  // Seçili çizim türünü etkinleştir
        });
    });
});
document.getElementById('query').addEventListener('click', function () {
    fetch('https://localhost:7245/api/Home')
        .then(response => response.json())
        .then(data => {
            const tableData = data.data || [];

            const panel = jsPanel.create({
                content: `
                    <h2>Database Information</h2>
                    <table id="myTable" class="display" style="width:100%">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>WKT</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                        </tbody>
                    </table>
                `,
                animateIn: 'jsPanelFadeIn',
                position: 'center',
                headerTitle: 'Query Results',
            });

            const tableBody = panel.content.querySelector('tbody');
            tableBody.innerHTML = '';

            tableData.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.name}</td>
                    <td>${item.wkt}</td>
                    <td class="center">
                        <button class="show-btn" data-wkt="${item.wkt}">Show</button>
                        <button class="update-btn" data-id="${item.id}" data-wkt="${item.wkt}" data-name="${item.name}">Update</button>
                        <button class="delete-btn" data-id="${item.id}">Delete</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });

            panel.content.addEventListener('click', function (event) {
                // Show button functionality
                if (event.target.classList.contains('show-btn')) {
                    const wkt = event.target.getAttribute('data-wkt');
                    const coordinates = parseWKT(wkt);

                    if (coordinates) {
                        const ss = vector.getSource();
                        const geom = wktFormat.readGeometry(wkt);
                        ss.addFeature(new ol.Feature(geom));
                        map.getView().fit(geom.getExtent(), { duration: 1500, padding: [50, 50, 50, 50], maxZoom: 15 });
                    }
                }

            // Update button functionality
if (event.target.classList.contains('update-btn')) {
    const id = event.target.getAttribute('data-id');
    const wkt = event.target.getAttribute('data-wkt');
    const name = event.target.getAttribute('data-name');

    const updatePanel = jsPanel.create({
        content: `
            <h2>Update Feature</h2>
            <input type="text" id="nameInput" placeholder="Name" value="${name}" />
            <textarea id="wktInput" placeholder="WKT">${wkt}</textarea>
            <select id="updateMethod">
                <option value="wkt">Update by Editing WKT</option>
                <option value="drag">Update by Dragging on Map</option>
            </select>
            <button id="updateButton">Save</button>
        `,
        animateIn: 'jsPanelFadeIn',
        position: 'center',
        headerTitle: 'Update Info',
    });

    updatePanel.content.querySelector('#updateButton').addEventListener('click', function () {
        const nameValue = document.getElementById('nameInput').value;
        const updateMethod = document.getElementById('updateMethod').value;

        let updatedData;

        if (updateMethod === 'wkt') {
            const wktValue = document.getElementById('wktInput').value;
            updatedData = {
                Id: id, // Burada Id'nin büyük harfle başlıyor olması gerekebilir
                Name: nameValue,
                WKT: wktValue
            };
        } else {
            const features = vector.getSource().getFeatures();
            if (features.length === 0) {
                alert('No features available for modification.');
                return;
            }
            const modifiedFeature = features[0];
            const modifiedGeom = modifiedFeature.getGeometry();
            const modifiedWkt = wktFormat.writeGeometry(modifiedGeom);

            updatedData = {
                Id: id,
                Name: nameValue,
                WKT: modifiedWkt
            };
        }

        // Güncelleme URL'sini kontrol edin
        fetch(`https://localhost:7245/api/Home/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(`HTTP error! status: ${response.status}, message: ${err.message}`);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Successfully updated:', data);
            alert('Shape updated successfully!');
            document.getElementById('query').click(); // Reload table
            updatePanel.close(); // Close the update panel
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while updating the shape.');
        });
    });

    const features = vector.getSource().getFeatures();
    if (features.length > 0) {
        const modifyInteraction = new ol.interaction.Modify({
            features: new ol.Collection([features[0]])
        });
        map.addInteraction(modifyInteraction);
    }
}

                // Delete button functionality
                if (event.target.classList.contains('delete-btn')) {
                    const id = event.target.getAttribute('data-id');

                    if (id) {
                        const deletePanel = jsPanel.create({
                            headerTitle: 'Delete Confirmation',
                            contentSize: '300 150',
                            content: `
                                <div>
                                    <p>Are you sure you want to delete this item?</p>
                                    <button id="confirmDeleteButton" style="width: 100%;">Yes, Delete</button>
                                </div>
                            `,
                            position: 'center 0 58',
                        });

                        document.getElementById('confirmDeleteButton').addEventListener('click', function () {
                            fetch(`https://localhost:7245/api/Home/${id}`, {
                                method: 'DELETE',
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            })
                            .then(response => response.json())
                            .then(data => {
                                console.log('Successfully deleted:', data);
                                alert('Shape deleted successfully!');
                                document.getElementById('query').click(); // Reload table
                                deletePanel.close(); // Close the delete panel
                            })
                            .catch(error => {
                                console.error('Error:', error);
                                alert('An error occurred while deleting the shape.');
                            });
                        });
                    }
                }
            });
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });
});

// WKT parsing function
function parseWKT(wkt) {
    const match = wkt.match(/^POINT\(([^ ]+) ([^ ]+)\)$/);
    if (match) {
        return [parseFloat(match[1]), parseFloat(match[2])];
    }
    return null;
}
// Popup elementi ve overlay oluşturma
const container = document.getElementById('popup');
const content = document.getElementById('popup-content');
const closer = document.getElementById('popup-closer');

const overlay = new ol.Overlay({
    element: container,
    autoPan: true,
    autoPanAnimation: {
        duration: 250,
    },
});
// pop-up 
map.addOverlay(overlay);

closer.onclick = function () {
    overlay.setPosition(undefined);
    closer.blur();
    return false;
};

// Haritada tıklama olayını dinleyin
map.on('singleclick', function (event) {
    const coordinate = event.coordinate;
    const hdms = ol.coordinate.toStringHDMS(ol.proj.toLonLat(coordinate));

    content.innerHTML = '<p>Koordinat:</p><code>' + hdms + '</code>';
    overlay.setPosition(coordinate);
});