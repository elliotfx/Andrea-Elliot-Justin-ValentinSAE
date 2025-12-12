/**
 * Module de gestion des filtres de dates personnalisés
 * Permet de créer, sauvegarder, appliquer et supprimer des filtres de dates
 */

const STORAGE_KEY = 'customDateFilters';

// =============================================================================
// FONCTIONS CRUD POUR LOCALSTORAGE
// =============================================================================

/**
 * Récupère tous les filtres personnalisés depuis le localStorage
 * @returns {Array} Liste des filtres
 */
export function getCustomFilters() {
    const filters = localStorage.getItem(STORAGE_KEY);
    return filters ? JSON.parse(filters) : [];
}

/**
 * Sauvegarde la liste des filtres dans le localStorage
 * @param {Array} filters - Liste des filtres à sauvegarder
 */
function saveFilters(filters) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
}

/**
 * Ajoute un nouveau filtre personnalisé
 * @param {string} name - Nom du filtre
 * @param {string} startDate - Date de début (format YYYY-MM-DD)
 * @param {string} endDate - Date de fin (format YYYY-MM-DD)
 * @returns {Object} Le filtre créé ou null si erreur
 */
export function addCustomFilter(name, startDate, endDate) {
    // Validation
    if (!name || !name.trim()) {
        showNotification('Veuillez saisir un nom pour le filtre.', 'error');
        return null;
    }

    if (!startDate || !endDate) {
        showNotification('Veuillez sélectionner les dates de début et de fin.', 'error');
        return null;
    }

    if (!validateDates(startDate, endDate)) {
        showNotification('La date de début doit être antérieure à la date de fin.', 'error');
        return null;
    }

    const filters = getCustomFilters();

    // Vérifier si un filtre avec ce nom existe déjà
    if (filters.some(f => f.name.toLowerCase() === name.trim().toLowerCase())) {
        showNotification('Un filtre avec ce nom existe déjà.', 'error');
        return null;
    }

    const newFilter = {
        id: Date.now().toString(),
        name: name.trim(),
        startDate,
        endDate,
        createdAt: new Date().toISOString()
    };

    filters.push(newFilter);
    saveFilters(filters);

    showNotification(`Filtre "${newFilter.name}" créé avec succès !`, 'success');
    return newFilter;
}

/**
 * Supprime un filtre par son ID
 * @param {string} filterId - ID du filtre à supprimer
 * @returns {boolean} True si supprimé, false sinon
 */
export function deleteCustomFilter(filterId) {
    const filters = getCustomFilters();
    const filterIndex = filters.findIndex(f => f.id === filterId);

    if (filterIndex === -1) {
        showNotification('Filtre non trouvé.', 'error');
        return false;
    }

    const deletedFilter = filters.splice(filterIndex, 1)[0];
    saveFilters(filters);

    showNotification(`Filtre "${deletedFilter.name}" supprimé.`, 'success');
    return true;
}

/**
 * Renomme un filtre existant
 * @param {string} filterId - ID du filtre à renommer
 * @param {string} newName - Nouveau nom
 * @returns {boolean} True si renommé, false sinon
 */
export function renameCustomFilter(filterId, newName) {
    if (!newName || !newName.trim()) {
        showNotification('Veuillez saisir un nouveau nom.', 'error');
        return false;
    }

    const filters = getCustomFilters();
    const filter = filters.find(f => f.id === filterId);

    if (!filter) {
        showNotification('Filtre non trouvé.', 'error');
        return false;
    }

    // Vérifier si le nouveau nom existe déjà
    if (filters.some(f => f.id !== filterId && f.name.toLowerCase() === newName.trim().toLowerCase())) {
        showNotification('Un filtre avec ce nom existe déjà.', 'error');
        return false;
    }

    filter.name = newName.trim();
    saveFilters(filters);

    showNotification(`Filtre renommé en "${newName}".`, 'success');
    return true;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Valide que la date de début est antérieure à la date de fin
 * @param {string} startDate - Date de début
 * @param {string} endDate - Date de fin
 * @returns {boolean} True si valide
 */
export function validateDates(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return start <= end;
}

// =============================================================================
// INTERFACE UTILISATEUR
// =============================================================================

/**
 * Affiche une notification temporaire
 * @param {string} message - Message à afficher
 * @param {string} type - Type de notification ('success' ou 'error')
 */
function showNotification(message, type = 'success') {
    // Supprimer les notifications existantes
    const existingNotification = document.querySelector('.custom-filter-notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `custom-filter-notification ${type}`;
    notification.innerHTML = `
        <span class="notification-icon">${type === 'success' ? '✓' : '✗'}</span>
        <span class="notification-message">${message}</span>
    `;
    document.body.appendChild(notification);

    // Animation d'entrée
    setTimeout(() => notification.classList.add('show'), 10);

    // Disparition automatique
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * Crée le bouton et le dropdown des filtres personnalisés
 * @param {HTMLElement} container - Élément où insérer le composant
 * @param {Function} onFilterApply - Callback appelée quand un filtre est appliqué
 */
export function createCustomFiltersUI(container, onFilterApply) {
    // Créer le conteneur principal
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-filters-wrapper';
    wrapper.innerHTML = `
        <div class="custom-filters-button-group">
            <button type="button" class="custom-filters-dropdown-btn" id="customFiltersDropdownBtn">
                <span class="filter-icon">📅</span>
                <span>Mes filtres</span>
                <span class="dropdown-arrow">▼</span>
            </button>
            <button type="button" class="custom-filters-add-btn" id="customFiltersAddBtn" title="Créer un nouveau filtre">
                +
            </button>
        </div>
        <div class="custom-filters-dropdown" id="customFiltersDropdown">
            <div class="custom-filters-list" id="customFiltersList">
                <!-- Les filtres seront insérés ici dynamiquement -->
            </div>
            <div class="custom-filters-empty" id="customFiltersEmpty">
                <p>Aucun filtre sauvegardé</p>
                <small>Cliquez sur + pour créer votre premier filtre</small>
            </div>
        </div>
    `;

    container.appendChild(wrapper);

    // Créer la modal de création de filtre
    createFilterModal();

    // Setup des événements
    setupCustomFiltersEvents(onFilterApply);

    // Charger la liste des filtres
    refreshFiltersList(onFilterApply);
}

/**
 * Crée la modal pour créer/éditer un filtre
 */
function createFilterModal() {
    // Vérifier si la modal existe déjà
    if (document.getElementById('customFilterModal')) return;

    const modal = document.createElement('div');
    modal.className = 'custom-filter-modal';
    modal.id = 'customFilterModal';
    modal.innerHTML = `
        <div class="custom-filter-modal-content">
            <div class="custom-filter-modal-header">
                <h3>Créer un filtre personnalisé</h3>
                <button type="button" class="custom-filter-modal-close" id="customFilterModalClose">&times;</button>
            </div>
            <div class="custom-filter-modal-body">
                <div class="custom-filter-form-group">
                    <label for="customFilterName">Nom du filtre</label>
                    <input type="text" id="customFilterName" placeholder="Ex: Saison basket 2024, Période examens...">
                </div>
                <div class="custom-filter-form-row">
                    <div class="custom-filter-form-group">
                        <label for="customFilterStartDate">Date de début</label>
                        <input type="date" id="customFilterStartDate">
                    </div>
                    <div class="custom-filter-form-group">
                        <label for="customFilterEndDate">Date de fin</label>
                        <input type="date" id="customFilterEndDate">
                    </div>
                </div>
            </div>
            <div class="custom-filter-modal-footer">
                <button type="button" class="custom-filter-btn-cancel" id="customFilterCancelBtn">Annuler</button>
                <button type="button" class="custom-filter-btn-save" id="customFilterSaveBtn">Sauvegarder</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

/**
 * Configure les événements de l'interface des filtres
 * @param {Function} onFilterApply - Callback appelée quand un filtre est appliqué
 */
function setupCustomFiltersEvents(onFilterApply) {
    const dropdownBtn = document.getElementById('customFiltersDropdownBtn');
    const addBtn = document.getElementById('customFiltersAddBtn');
    const dropdown = document.getElementById('customFiltersDropdown');
    const modal = document.getElementById('customFilterModal');
    const modalClose = document.getElementById('customFilterModalClose');
    const cancelBtn = document.getElementById('customFilterCancelBtn');
    const saveBtn = document.getElementById('customFilterSaveBtn');

    // Toggle dropdown
    dropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
    });

    // Ouvrir la modal pour créer un filtre
    addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openFilterModal();
    });

    // Fermer le dropdown quand on clique ailleurs
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-filters-wrapper')) {
            dropdown.classList.remove('show');
        }
    });

    // Fermer la modal
    modalClose.addEventListener('click', closeFilterModal);
    cancelBtn.addEventListener('click', closeFilterModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeFilterModal();
        }
    });

    // Sauvegarder le filtre
    saveBtn.addEventListener('click', () => {
        const name = document.getElementById('customFilterName').value;
        const startDate = document.getElementById('customFilterStartDate').value;
        const endDate = document.getElementById('customFilterEndDate').value;

        const newFilter = addCustomFilter(name, startDate, endDate);

        if (newFilter) {
            closeFilterModal();
            refreshFiltersList(onFilterApply);
        }
    });

    // Permettre la soumission avec Enter
    document.getElementById('customFilterName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveBtn.click();
        }
    });
}

/**
 * Ouvre la modal de création de filtre
 */
function openFilterModal() {
    const modal = document.getElementById('customFilterModal');
    const startDateInput = document.getElementById('customFilterStartDate');
    const endDateInput = document.getElementById('customFilterEndDate');

    // Pré-remplir avec les dates actuelles des champs de filtre si disponibles
    const pageStartDate = document.getElementById('start-date');
    const pageEndDate = document.getElementById('end-date');

    if (pageStartDate && pageStartDate.value) {
        startDateInput.value = pageStartDate.value;
    }
    if (pageEndDate && pageEndDate.value) {
        endDateInput.value = pageEndDate.value;
    }

    // Réinitialiser le nom
    document.getElementById('customFilterName').value = '';

    modal.classList.add('show');
    document.getElementById('customFilterName').focus();
}

/**
 * Ferme la modal de création de filtre
 */
function closeFilterModal() {
    const modal = document.getElementById('customFilterModal');
    modal.classList.remove('show');
}

/**
 * Rafraîchit la liste des filtres dans le dropdown
 * @param {Function} onFilterApply - Callback appelée quand un filtre est appliqué
 */
export function refreshFiltersList(onFilterApply) {
    const listContainer = document.getElementById('customFiltersList');
    const emptyMessage = document.getElementById('customFiltersEmpty');

    if (!listContainer) return;

    const filters = getCustomFilters();

    // Afficher/masquer le message "vide"
    if (filters.length === 0) {
        listContainer.style.display = 'none';
        emptyMessage.style.display = 'block';
        return;
    }

    listContainer.style.display = 'block';
    emptyMessage.style.display = 'none';

    // Générer le HTML des filtres
    listContainer.innerHTML = filters.map(filter => {
        const startFormatted = formatDate(filter.startDate);
        const endFormatted = formatDate(filter.endDate);

        return `
            <div class="custom-filter-item" data-filter-id="${filter.id}">
                <div class="custom-filter-item-info" data-filter-id="${filter.id}" data-start="${filter.startDate}" data-end="${filter.endDate}">
                    <span class="custom-filter-item-name">${escapeHtml(filter.name)}</span>
                    <span class="custom-filter-item-dates">${startFormatted} → ${endFormatted}</span>
                </div>
                <div class="custom-filter-item-actions">
                    <button type="button" class="custom-filter-item-btn rename-btn" data-filter-id="${filter.id}" title="Renommer">✏️</button>
                    <button type="button" class="custom-filter-item-btn delete-btn" data-filter-id="${filter.id}" title="Supprimer">🗑️</button>
                </div>
            </div>
        `;
    }).join('');

    // Ajouter les événements pour chaque filtre
    listContainer.querySelectorAll('.custom-filter-item-info').forEach(item => {
        item.addEventListener('click', () => {
            const startDate = item.dataset.start;
            const endDate = item.dataset.end;

            // Mettre à jour les champs de date de la page
            const pageStartDate = document.getElementById('start-date');
            const pageEndDate = document.getElementById('end-date');

            if (pageStartDate) pageStartDate.value = startDate;
            if (pageEndDate) pageEndDate.value = endDate;

            // Fermer le dropdown
            document.getElementById('customFiltersDropdown').classList.remove('show');

            // Appeler le callback pour appliquer le filtre
            if (onFilterApply) {
                onFilterApply(startDate, endDate);
            }

            // Notification
            const filterName = item.querySelector('.custom-filter-item-name').textContent;
            showNotification(`Filtre "${filterName}" appliqué.`, 'success');
        });
    });

    // Événements de suppression
    listContainer.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const filterId = btn.dataset.filterId;

            if (confirm('Êtes-vous sûr de vouloir supprimer ce filtre ?')) {
                if (deleteCustomFilter(filterId)) {
                    refreshFiltersList(onFilterApply);
                }
            }
        });
    });

    // Événements de renommage
    listContainer.querySelectorAll('.rename-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const filterId = btn.dataset.filterId;
            const filters = getCustomFilters();
            const filter = filters.find(f => f.id === filterId);

            if (filter) {
                const newName = prompt('Nouveau nom du filtre :', filter.name);
                if (newName !== null && newName.trim() !== '') {
                    if (renameCustomFilter(filterId, newName)) {
                        refreshFiltersList(onFilterApply);
                    }
                }
            }
        });
    });
}

// =============================================================================
// UTILITAIRES
// =============================================================================

/**
 * Formate une date pour l'affichage
 * @param {string} dateString - Date au format YYYY-MM-DD
 * @returns {string} Date formatée (ex: 15/01/2024)
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

/**
 * Échappe les caractères HTML pour éviter les injections XSS
 * @param {string} text - Texte à échapper
 * @returns {string} Texte échappé
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
