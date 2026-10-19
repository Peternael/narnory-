// NarNory - Romantic Scrapbook JavaScript (updated)
const DEFAULT_START_DATE = '2025-01-01';
const DEFAULT_SURPRISE_MESSAGE = 'أنا بحبك أوي أوي ❤️💕 وكل يوم بحبك أكتر، وإنتِ أجمل حاجة حصلتلي في حياتي ❤️❤️';
const sharedMemoriesReady = fetch('assets/memories.json')
    .then(response => {
        if (!response.ok) throw new Error(`Could not load shared memories (${response.status}).`);
        return response.json();
    })
    .catch(error => {
        console.error('Shared memories could not be loaded.', error);
        return null;
    });

// Navigation
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
const navLinks = document.querySelectorAll('.nav-link');
if (navToggle) {
    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });
}
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
    });
});

// Counter
const startDateInput = document.getElementById('startDate');
const daysEl = document.getElementById('days');
const monthsEl = document.getElementById('months');
const yearsEl = document.getElementById('years');

function calculateDays() {
    if (!startDateInput) return;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDateInput.value);
    const today = new Date();
    const todayParts = [today.getFullYear(), today.getMonth() + 1, today.getDate()];
    const toDayNumber = (year, month, day) => {
        const date = new Date(0);
        date.setUTCFullYear(year, month - 1, day);
        date.setUTCHours(0, 0, 0, 0);
        return date.getTime() / 86400000;
    };
    const showZero = () => {
        if (daysEl) daysEl.textContent = '0';
        if (monthsEl) monthsEl.textContent = '0';
        if (yearsEl) yearsEl.textContent = '0';
    };

    if (!match) {
        showZero();
        return;
    }

    const startParts = match.slice(1).map(Number);
    const [startYear, startMonth, startDay] = startParts;
    const startDate = new Date(0);
    startDate.setFullYear(startYear, startMonth - 1, startDay);
    if (
        startDate.getFullYear() !== startYear ||
        startDate.getMonth() !== startMonth - 1 ||
        startDate.getDate() !== startDay
    ) {
        showZero();
        return;
    }

    const startDayNumber = toDayNumber(...startParts);
    const todayDayNumber = toDayNumber(...todayParts);
    if (startDayNumber > todayDayNumber) {
        showZero();
        return;
    }

    const daysInMonth = (year, month) => {
        const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
        return [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
    };
    const addMonths = (offset) => {
        const monthIndex = startYear * 12 + startMonth - 1 + offset;
        const year = Math.floor(monthIndex / 12);
        const month = monthIndex % 12 + 1;
        return [year, month, Math.min(startDay, daysInMonth(year, month))];
    };

    let elapsedMonths = (todayParts[0] - startYear) * 12 + todayParts[1] - startMonth;
    if (toDayNumber(...addMonths(elapsedMonths)) > todayDayNumber) elapsedMonths--;
    const anniversary = addMonths(elapsedMonths);
    if (daysEl) daysEl.textContent = todayDayNumber - toDayNumber(...anniversary);
    if (monthsEl) monthsEl.textContent = elapsedMonths % 12;
    if (yearsEl) yearsEl.textContent = Math.floor(elapsedMonths / 12);
}

function initCounter(sharedMemories) {
    const savedStartDate = localStorage.getItem('narNory_startDate');
    if (startDateInput) {
        if (savedStartDate !== null) {
            startDateInput.value = savedStartDate;
        } else {
            startDateInput.value = sharedMemories && sharedMemories.startDate
                ? sharedMemories.startDate
                : DEFAULT_START_DATE;
        }
        startDateInput.addEventListener('input', () => {
            localStorage.setItem('narNory_startDate', startDateInput.value);
            calculateDays();
        });
        startDateInput.addEventListener('change', () => {
            localStorage.setItem('narNory_startDate', startDateInput.value);
            calculateDays();
        });
    }
    calculateDays();
    setInterval(calculateDays, 1000 * 60 * 60);
}

// Gallery - per card support
const galleryGrid = document.getElementById('galleryGrid');
const photoInputFirst = document.getElementById('photoInputFirst');
const photoInputSweet = document.getElementById('photoInputSweet');
const photoInputForever = document.getElementById('photoInputForever');
const photoInput = document.getElementById('photoInput');
const addPhotosBtn = document.getElementById('addPhotosBtn');
const photoUploadStatus = document.getElementById('photoUploadStatus');
const replaceGalleryPhotoInput = document.getElementById('replaceGalleryPhotoInput');
const photoLightbox = document.getElementById('photoLightbox');
const photoLightboxImage = document.getElementById('photoLightboxImage');
const photoLightboxStatus = document.getElementById('photoLightboxStatus');
const photoLightboxClose = document.getElementById('photoLightboxClose');
const keepGalleryPhoto = document.getElementById('keepGalleryPhoto');
const changeGalleryPhoto = document.getElementById('changeGalleryPhoto');
let galleryPhotoDatabase;
let activeGalleryPhoto = null;
let pendingGalleryPhoto = null;
const galleryPhotoUrls = new Set();

function setPhotoUploadStatus(message) {
    if (photoUploadStatus) photoUploadStatus.textContent = message;
}

async function getPhotoHash(blob) {
    if (!window.crypto || !window.crypto.subtle) return null;
    const digest = await window.crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function openGalleryPhotoDatabase() {
    if (galleryPhotoDatabase) return galleryPhotoDatabase;

    galleryPhotoDatabase = new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error('This browser does not support local photo storage.'));
            return;
        }
        const request = window.indexedDB.open('narNoryGallery', 1);
        request.onupgradeneeded = () => {
            request.result.createObjectStore('photos', { autoIncrement: true });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Could not open photo storage.'));
    }).catch(error => {
        galleryPhotoDatabase = null;
        throw error;
    });

    return galleryPhotoDatabase;
}

function appendGalleryPhoto(file, photoId, captionText) {
    if (!galleryGrid) return;
    const card = document.createElement('div');
    card.className = 'photo-card';
    const polaroid = document.createElement('div');
    polaroid.className = 'polaroid';
    const image = document.createElement('div');
    image.className = 'polaroid-image';
    const objectUrl = URL.createObjectURL(file);
    galleryPhotoUrls.add(objectUrl);
    image.style.backgroundImage = `url("${objectUrl}")`;
    image.dataset.galleryPhoto = 'true';
    image.dataset.objectUrl = objectUrl;
    if (photoId !== undefined && photoId !== null) image.dataset.photoId = photoId;
    image.setAttribute('role', 'img');
    image.setAttribute('aria-label', file.name);
    const captionWrap = document.createElement('div');
    captionWrap.className = 'polaroid-caption';
    const caption = document.createElement('div');
    caption.className = 'editable-caption';
    caption.contentEditable = 'true';
    caption.textContent = captionText || file.name.replace(/\.[^.]+$/, '');
    captionWrap.appendChild(caption);
    polaroid.append(image, captionWrap);
    card.appendChild(polaroid);
    galleryGrid.appendChild(card);
}

function appendSharedGalleryPhoto(photo) {
    if (!galleryGrid) return;
    const src = photo.path || photo.src;
    const card = document.createElement('div');
    card.className = 'photo-card';
    const polaroid = document.createElement('div');
    polaroid.className = 'polaroid';
    const image = document.createElement('div');
    image.className = 'polaroid-image';
    image.style.backgroundImage = `url("${src}")`;
    image.dataset.galleryPhoto = 'true';
    image.dataset.sourceId = photo.id;
    image.setAttribute('role', 'img');
    image.setAttribute('aria-label', photo.caption || 'Shared memory photo');
    const captionWrap = document.createElement('div');
    captionWrap.className = 'polaroid-caption';
    const caption = document.createElement('div');
    caption.className = 'editable-caption';
    caption.contentEditable = 'true';
    let savedCaptions = {};
    try {
        savedCaptions = JSON.parse(localStorage.getItem('narNory_sharedCaptions') || '{}');
    } catch (error) {
        setPhotoUploadStatus(`Saved captions could not be read: ${error.message}`);
    }
    caption.textContent = Object.prototype.hasOwnProperty.call(savedCaptions, photo.id)
        ? savedCaptions[photo.id]
        : (photo.caption || '');
    caption.addEventListener('blur', () => {
        try {
            const latestCaptions = JSON.parse(localStorage.getItem('narNory_sharedCaptions') || '{}');
            latestCaptions[photo.id] = caption.textContent;
            localStorage.setItem('narNory_sharedCaptions', JSON.stringify(latestCaptions));
        } catch (error) {
            setPhotoUploadStatus(`Caption could not be saved: ${error.message}`);
        }
    });
    captionWrap.appendChild(caption);
    polaroid.append(image, captionWrap);
    card.appendChild(polaroid);
    galleryGrid.appendChild(card);
    return image;
}

async function getSharedPhotoReplacement(sourceId) {
    const database = await openGalleryPhotoDatabase();
    const transaction = database.transaction('photos', 'readonly');
    const request = transaction.objectStore('photos').get(`replacement:${sourceId}`);
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error || new Error('Could not load a saved photo replacement.'));
    });
}

async function saveSharedPhotoReplacement(sourceId, file) {
    const database = await openGalleryPhotoDatabase();
    const transaction = database.transaction('photos', 'readwrite');
    transaction.objectStore('photos').put(file, `replacement:${sourceId}`);
    return new Promise((resolve, reject) => {
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error || new Error('Could not save the replacement photo.'));
        transaction.onabort = () => reject(transaction.error || new Error('Replacing the photo was cancelled.'));
    });
}

async function loadAddedGalleryPhotos(sharedMemories) {
    if (!galleryGrid) return;
    const seenHashes = new Set();
    const localPhotos = [];
    try {
        const savedPhotos = JSON.parse(localStorage.getItem('narNory_photos') || '[]');
        if (Array.isArray(savedPhotos)) {
            savedPhotos.forEach((photo, index) => {
                if (photo && typeof photo.src === 'string') {
                    localPhotos.push({
                        id: `narNory_photos:${index}`,
                        src: photo.src,
                        caption: typeof photo.caption === 'string' ? photo.caption : ''
                    });
                }
            });
        }
    } catch (error) {
        setPhotoUploadStatus(`Saved browser photos could not be read: ${error.message}`);
    }

    const addSharedIfUnique = async photo => {
        if (photo.duplicateOf) return;
        let hash = photo.sha256 || null;
        if (!hash && photo.src && photo.src.startsWith('data:')) {
            try {
                hash = await getPhotoHash(await (await fetch(photo.src)).blob());
            } catch (error) {
                console.warn(`Could not fingerprint saved photo ${photo.id}.`, error);
            }
        }
        if (hash && seenHashes.has(hash)) return;
        if (hash) seenHashes.add(hash);
        const image = appendSharedGalleryPhoto(photo);
        try {
            const replacement = await getSharedPhotoReplacement(photo.id);
            if (replacement) {
                const objectUrl = URL.createObjectURL(replacement);
                galleryPhotoUrls.add(objectUrl);
                image.style.backgroundImage = `url("${objectUrl}")`;
                image.dataset.objectUrl = objectUrl;
                image.setAttribute('aria-label', photo.caption || 'Shared memory photo');
            }
        } catch (error) {
            setPhotoUploadStatus(`${error.message} The shared original photo remains available.`);
        }
    };

    for (const photo of localPhotos) await addSharedIfUnique(photo);

    let database;
    try {
        database = await openGalleryPhotoDatabase();
        const transaction = database.transaction('photos', 'readonly');
        const request = transaction.objectStore('photos').openCursor();
        const records = await new Promise((resolve, reject) => {
            const saved = [];
            request.onsuccess = () => {
                const cursor = request.result;
                if (!cursor) {
                    resolve(saved);
                    return;
                }
                if (typeof cursor.key === 'number') {
                    saved.push({ file: cursor.value, key: cursor.key });
                }
                cursor.continue();
            };
            request.onerror = () => reject(request.error || new Error('Could not load saved photos.'));
        });
        for (const record of records) {
            const hash = await getPhotoHash(record.file).catch(error => {
                console.warn('Could not fingerprint a saved gallery photo.', error);
                return null;
            });
            if (hash && seenHashes.has(hash)) continue;
            if (hash) seenHashes.add(hash);
            appendGalleryPhoto(record.file, record.key);
        }
    } catch (error) {
        setPhotoUploadStatus(`${error.message} Shared photos remain available.`);
    }

    for (const photo of sharedMemories && Array.isArray(sharedMemories.gallery) ? sharedMemories.gallery : []) {
        await addSharedIfUnique(photo);
    }
}

async function saveAddedGalleryPhotos(files) {
    const database = await openGalleryPhotoDatabase();
    const transaction = database.transaction('photos', 'readwrite');
    const requests = files.map(file => transaction.objectStore('photos').add(file));
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve(requests.map(request => request.result));
        transaction.onerror = () => reject(transaction.error || new Error('Could not save selected photos.'));
        transaction.onabort = () => reject(transaction.error || new Error('Saving selected photos was cancelled.'));
        requests.forEach(request => {
            request.onerror = () => reject(request.error || new Error('Could not save a selected photo.'));
        });
    });
}

async function replaceSavedGalleryPhoto(photoId, file) {
    const database = await openGalleryPhotoDatabase();
    const transaction = database.transaction('photos', 'readwrite');
    transaction.objectStore('photos').put(file, Number(photoId));
    return new Promise((resolve, reject) => {
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error || new Error('Could not save the replacement photo.'));
        transaction.onabort = () => reject(transaction.error || new Error('Replacing the photo was cancelled.'));
    });
}

function closePhotoLightbox() {
    if (!photoLightbox) return;
    photoLightbox.hidden = true;
    photoLightboxImage.removeAttribute('src');
    activeGalleryPhoto = null;
}

function openPhotoLightbox(image) {
    const objectUrl = image.dataset.objectUrl;
    const backgroundImage = image.style.backgroundImage;
    const imageUrl = objectUrl || (backgroundImage.match(/^url\((?:"|')?(.*?)(?:"|')?\)$/) || [])[1];
    if (!imageUrl) return;

    activeGalleryPhoto = {
        image,
        photoId: image.dataset.photoId || null,
        sourceId: image.dataset.sourceId || null,
        cardKey: image.getAttribute('data-card')
    };
    photoLightboxImage.src = imageUrl;
    photoLightbox.hidden = false;
    photoLightboxStatus.textContent = '';
    changeGalleryPhoto.hidden = !activeGalleryPhoto.photoId
        && !activeGalleryPhoto.sourceId
        && !activeGalleryPhoto.cardKey;
    photoLightboxClose.focus();
}

if (galleryGrid) {
    galleryGrid.addEventListener('click', event => {
        if (event.target.closest('[contenteditable="true"]')) return;
        const card = event.target.closest('.photo-card');
        const image = event.target.closest('.polaroid-image') || (card && card.querySelector('.polaroid-image'));
        if (!image) return;
        if (image.dataset.galleryPhoto === 'true' || image.hasAttribute('data-card')) {
            openPhotoLightbox(image);
        }
    });
}

if (photoLightbox) {
    photoLightboxImage.addEventListener('error', () => {
        photoLightboxStatus.textContent = 'This image could not be displayed.';
    });
    photoLightbox.addEventListener('click', event => {
        if (event.target === photoLightbox) closePhotoLightbox();
    });
    photoLightboxClose.addEventListener('click', closePhotoLightbox);
    keepGalleryPhoto.addEventListener('click', closePhotoLightbox);
    changeGalleryPhoto.addEventListener('click', () => {
        if (!activeGalleryPhoto) return;
        if (activeGalleryPhoto.photoId && replaceGalleryPhotoInput) {
            pendingGalleryPhoto = activeGalleryPhoto;
            replaceGalleryPhotoInput.click();
            return;
        }
        if (activeGalleryPhoto.sourceId && replaceGalleryPhotoInput) {
            pendingGalleryPhoto = activeGalleryPhoto;
            replaceGalleryPhotoInput.click();
            return;
        }
        const replacementInputs = {
            'first-memory': photoInputFirst,
            'sweet-moments': photoInputSweet,
            'forever-together': photoInputForever
        };
        const input = replacementInputs[activeGalleryPhoto.cardKey];
        if (input) input.click();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !photoLightbox.hidden) closePhotoLightbox();
    });
}

if (replaceGalleryPhotoInput) {
    replaceGalleryPhotoInput.addEventListener('change', async () => {
        const file = replaceGalleryPhotoInput.files && replaceGalleryPhotoInput.files[0];
        const current = pendingGalleryPhoto;
        pendingGalleryPhoto = null;
        replaceGalleryPhotoInput.value = '';
        if (!file) {
            if (photoLightboxStatus) photoLightboxStatus.textContent = 'Original photo kept; no replacement selected.';
            return;
        }
        if (!file.type.startsWith('image/')) {
            if (photoLightboxStatus) photoLightboxStatus.textContent = 'Please choose a valid image. The original photo is unchanged.';
            return;
        }
        if (!current || (!current.photoId && !current.sourceId)) return;

        const newUrl = URL.createObjectURL(file);
        try {
            if (current.photoId) {
                await replaceSavedGalleryPhoto(current.photoId, file);
            } else {
                await saveSharedPhotoReplacement(current.sourceId, file);
            }
            const oldUrl = current.image.dataset.objectUrl;
            current.image.style.backgroundImage = `url("${newUrl}")`;
            current.image.dataset.objectUrl = newUrl;
            current.image.setAttribute('aria-label', file.name);
            if (activeGalleryPhoto === current) photoLightboxImage.src = newUrl;
            galleryPhotoUrls.add(newUrl);
            if (oldUrl && galleryPhotoUrls.has(oldUrl)) {
                URL.revokeObjectURL(oldUrl);
                galleryPhotoUrls.delete(oldUrl);
            }
            if (photoLightboxStatus && activeGalleryPhoto === current) {
                photoLightboxStatus.textContent = 'Photo replaced and saved on this device.';
            }
        } catch (error) {
            URL.revokeObjectURL(newUrl);
            if (photoLightboxStatus && activeGalleryPhoto === current) {
                photoLightboxStatus.textContent = `${error.message} The original photo is unchanged.`;
            }
        }
    });
    replaceGalleryPhotoInput.addEventListener('cancel', () => {
        pendingGalleryPhoto = null;
        if (photoLightboxStatus) photoLightboxStatus.textContent = 'Original photo kept; no replacement selected.';
    });
}

const galleryPhotosReady = sharedMemoriesReady
    .then(async sharedMemories => {
        loadSavedCardPhotos(sharedMemories);
        await loadAddedGalleryPhotos(sharedMemories);
    })
    .catch(error => {
        setPhotoUploadStatus(`${error.message} Photos can still be added until you leave this page.`);
    });

if (addPhotosBtn && photoInput) {
    addPhotosBtn.addEventListener('click', () => photoInput.click());
    photoInput.addEventListener('change', async () => {
        const selectedFiles = Array.from(photoInput.files || []);
        photoInput.value = '';
        if (selectedFiles.length === 0) {
            setPhotoUploadStatus('No photos selected.');
            return;
        }

        const imageFiles = selectedFiles.filter(file => file.type.startsWith('image/'));
        const invalidCount = selectedFiles.length - imageFiles.length;
        if (imageFiles.length === 0) {
            setPhotoUploadStatus('Please select valid image files.');
            return;
        }

        await galleryPhotosReady;
        try {
            const photoIds = await saveAddedGalleryPhotos(imageFiles);
            imageFiles.forEach((file, index) => appendGalleryPhoto(file, photoIds[index]));
            setPhotoUploadStatus(`${imageFiles.length} photo${imageFiles.length === 1 ? '' : 's'} added.${invalidCount ? ` Skipped ${invalidCount} invalid file${invalidCount === 1 ? '' : 's'}.` : ''}`);
        } catch (error) {
            imageFiles.forEach(file => appendGalleryPhoto(file));
            setPhotoUploadStatus(`${error.message} Photos were added for this visit but could not be saved.${invalidCount ? ` Skipped ${invalidCount} invalid file${invalidCount === 1 ? '' : 's'}.` : ''}`);
        }
    });
}

function setCardImage(cardKey, imageSrc) {
    const imgEl = galleryGrid
        ? galleryGrid.querySelector(`[data-card="${cardKey}"]`)
        : null;

    if (imgEl) {
        imgEl.style.backgroundImage = `url('${imageSrc}')`;
        imgEl.removeAttribute('data-placeholder');
    }
}

function loadSavedCardPhotos(sharedMemories) {
    const saved = JSON.parse(localStorage.getItem('narNory_cardPhotos') || '{}');
    Object.entries(sharedMemories && sharedMemories.cards || {}).forEach(([key, photo]) => {
        if (!saved[key]) setCardImage(key, photo.path);
    });
    if (saved['first-memory']) setCardImage('first-memory', saved['first-memory']);
    if (saved['sweet-moments']) setCardImage('sweet-moments', saved['sweet-moments']);
    if (saved['forever-together']) setCardImage('forever-together', saved['forever-together']);
}

function attachPerCardInput(inputEl, cardKey) {
    if (!inputEl) return;
    inputEl.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        inputEl.value = '';
        if (!file) {
            if (activeGalleryPhoto && activeGalleryPhoto.cardKey === cardKey) {
                photoLightboxStatus.textContent = 'Original photo kept; no replacement selected.';
            }
            return;
        }
        if (!file.type.startsWith('image/')) {
            if (activeGalleryPhoto && activeGalleryPhoto.cardKey === cardKey) {
                photoLightboxStatus.textContent = 'Please choose a valid image. The original photo is unchanged.';
            }
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            const src = event.target.result;
            setCardImage(cardKey, src);
            if (activeGalleryPhoto && activeGalleryPhoto.cardKey === cardKey) {
                photoLightboxImage.src = src;
                photoLightboxStatus.textContent = 'Photo replaced and saved on this device.';
            }
            const saved = JSON.parse(localStorage.getItem('narNory_cardPhotos') || '{}');
            saved[cardKey] = src;
            localStorage.setItem('narNory_cardPhotos', JSON.stringify(saved));
        };
        reader.readAsDataURL(file);
    });
}

attachPerCardInput(photoInputFirst, 'first-memory');
attachPerCardInput(photoInputSweet, 'sweet-moments');
attachPerCardInput(photoInputForever, 'forever-together');
window.addEventListener('beforeunload', () => {
    galleryPhotoUrls.forEach(objectUrl => URL.revokeObjectURL(objectUrl));
});

// Timeline
const addTimelineBtn = document.getElementById('addTimelineBtn');
const timelineContainer = document.getElementById('timelineContainer');
function createTimelineItem(title = '', date = '', description = '') {
    const timelineItem = document.createElement('div');
    timelineItem.className = 'timeline-item';
    const timelineDot = document.createElement('div');
    timelineDot.className = 'timeline-dot';
    const timelineContent = document.createElement('div');
    timelineContent.className = 'timeline-content';
    const timelineTitle = document.createElement('div');
    timelineTitle.className = 'timeline-title';
    timelineTitle.contentEditable = true;
    timelineTitle.textContent = title;
    timelineTitle.setAttribute('data-default', '');
    const timelineDate = document.createElement('div');
    timelineDate.className = 'timeline-date';
    timelineDate.contentEditable = true;
    timelineDate.textContent = date || new Date().toISOString().split('T')[0];
    timelineDate.setAttribute('data-default', new Date().toISOString().split('T')[0]);
    const timelineDescription = document.createElement('div');
    timelineDescription.className = 'timeline-description';
    timelineDescription.contentEditable = true;
    timelineDescription.textContent = description;
    timelineDescription.setAttribute('data-default', '');
    [timelineTitle, timelineDate, timelineDescription].forEach(el => {
        el.addEventListener('blur', saveTimeline);
    });
    timelineContent.appendChild(timelineTitle);
    timelineContent.appendChild(timelineDate);
    timelineContent.appendChild(timelineDescription);
    timelineItem.appendChild(timelineDot);
    timelineItem.appendChild(timelineContent);
    return timelineItem;
}
if (addTimelineBtn && timelineContainer) {
    addTimelineBtn.addEventListener('click', () => {
        const newItem = createTimelineItem();
        timelineContainer.appendChild(newItem);
        saveTimeline();
        newItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
}
function saveTimeline() {
    if (!timelineContainer) return;
    const items = timelineContainer.querySelectorAll('.timeline-item');
    const timelineData = [];
    items.forEach(item => {
        const title = item.querySelector('.timeline-title').textContent;
        const date = item.querySelector('.timeline-date').textContent;
        const description = item.querySelector('.timeline-description').textContent;
        timelineData.push({ title, date, description });
    });
    localStorage.setItem('narNory_timeline', JSON.stringify(timelineData));
}
function loadTimeline(sharedMemories) {
    if (!timelineContainer) return;
    const savedTimeline = JSON.parse(localStorage.getItem('narNory_timeline') || '[]');
    if (savedTimeline.length > 0) {
        timelineContainer.innerHTML = '';
        savedTimeline.forEach(itemData => {
            const newItem = createTimelineItem(itemData.title, itemData.date, itemData.description);
            timelineContainer.appendChild(newItem);
        });
        return;
    }
    const sharedTimeline = sharedMemories && Array.isArray(sharedMemories.timeline)
        ? sharedMemories.timeline.filter(item => !item.duplicateOf)
        : [];
    if (sharedTimeline.length > 0) {
        timelineContainer.innerHTML = '';
        sharedTimeline.forEach(itemData => {
            const newItem = createTimelineItem(itemData.title, itemData.date, itemData.description);
            timelineContainer.appendChild(newItem);
        });
    } else {
        timelineContainer.querySelectorAll('.timeline-item').forEach(item => {
            item.querySelector('.timeline-title').addEventListener('blur', saveTimeline);
            item.querySelector('.timeline-date').addEventListener('blur', saveTimeline);
            item.querySelector('.timeline-description').addEventListener('blur', saveTimeline);
        });
    }
}
if (timelineContainer) {
    sharedMemoriesReady.then(loadTimeline).catch(error => {
        console.error('Timeline memories could not be loaded.', error);
    });
}

// Love letter
const loveLetterEl = document.getElementById('loveLetter');
if (loveLetterEl) {
    const savedLetter = localStorage.getItem('narNory_loveLetter');
    if (savedLetter !== null) {
        loveLetterEl.textContent = savedLetter;
    }
    loveLetterEl.addEventListener('input', () => {
        localStorage.setItem('narNory_loveLetter', loveLetterEl.textContent);
    });
    loveLetterEl.addEventListener('blur', () => {
        localStorage.setItem('narNory_loveLetter', loveLetterEl.textContent);
    });
}

const heroTitleEl = document.getElementById('heroTitle');
const heroSubtitleEl = document.getElementById('heroSubtitle');
const songSubtitleEl = document.getElementById('songSubtitle');
sharedMemoriesReady.then(sharedMemories => {
    if (!sharedMemories || !sharedMemories.text) return;
    const text = sharedMemories.text;
    if (heroTitleEl && text.heroTitle) heroTitleEl.textContent = text.heroTitle;
    if (heroSubtitleEl && text.heroSubtitle) heroSubtitleEl.textContent = text.heroSubtitle;
    if (songSubtitleEl && text.songSub) songSubtitleEl.textContent = text.songSub;
    if (loveLetterEl && localStorage.getItem('narNory_loveLetter') === null && text.letter) {
        loveLetterEl.textContent = text.letter;
    }
    if (surpriseMessageEl && text.surprise) surpriseMessageEl.textContent = text.surprise;
});

// Music
const musicInput = document.getElementById('musicInput');
const musicCoverInput = document.getElementById('musicCoverInput');
const audioPlayer = document.getElementById('audioPlayer');
const selectedMusicEl = document.getElementById('selectedMusic');
const musicCoverEl = document.getElementById('musicCover');
const musicIconEl = document.getElementById('musicIcon');
const musicStatusEl = document.getElementById('musicStatus');
let musicDatabase;
let musicAudioUrl;
let musicCoverUrl;
let currentMusicCover = null;

function setMusicStatus(message) {
    if (musicStatusEl) musicStatusEl.textContent = message;
}

function openMusicDatabase() {
    if (musicDatabase) return musicDatabase;
    musicDatabase = new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error('This browser does not support saved music.'));
            return;
        }
        const request = window.indexedDB.open('narNoryMusic', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('selection');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Could not open music storage.'));
    }).catch(error => {
        musicDatabase = null;
        throw error;
    });
    return musicDatabase;
}

function updateMusicCover(file) {
    if (!musicCoverEl || !musicIconEl) return;
    currentMusicCover = file || null;
    const previousCoverUrl = musicCoverUrl;
    if (!file) {
        musicCoverUrl = null;
        musicCoverEl.removeAttribute('src');
        musicCoverEl.hidden = true;
        musicIconEl.hidden = false;
        if (previousCoverUrl) URL.revokeObjectURL(previousCoverUrl);
        return;
    }
    musicCoverUrl = URL.createObjectURL(file);
    musicCoverEl.src = musicCoverUrl;
    musicCoverEl.hidden = false;
    musicIconEl.hidden = true;
    if (previousCoverUrl) URL.revokeObjectURL(previousCoverUrl);
}

function setMusicSource(file) {
    const previousAudioUrl = musicAudioUrl;
    audioPlayer.pause();
    if (typeof file === 'string') {
        musicAudioUrl = null;
        audioPlayer.src = file;
    } else {
        musicAudioUrl = URL.createObjectURL(file);
        audioPlayer.src = musicAudioUrl;
    }
    audioPlayer.style.display = 'inline-block';
    if (previousAudioUrl) URL.revokeObjectURL(previousAudioUrl);
}

async function saveMusicSelection(song, cover) {
    const database = await openMusicDatabase();
    const transaction = database.transaction('selection', 'readwrite');
    transaction.objectStore('selection').put({ song, cover, name: song.name }, 'current');
    return new Promise((resolve, reject) => {
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error || new Error('Could not save the selected music.'));
        transaction.onabort = () => reject(transaction.error || new Error('Saving the selected music was cancelled.'));
    });
}

async function loadMusicSelection() {
    const database = await openMusicDatabase();
    const transaction = database.transaction('selection', 'readonly');
    const request = transaction.objectStore('selection').get('current');
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error || new Error('Could not restore the selected music.'));
    });
}

if (musicInput && audioPlayer && selectedMusicEl) {
    const musicReady = Promise.all([
        loadMusicSelection().catch(error => {
            setMusicStatus(`${error.message} Shared music will be used if available.`);
            return null;
        }),
        sharedMemoriesReady
    ]).then(async ([saved, sharedMemories]) => {
        if (saved && saved.song) {
            selectedMusicEl.textContent = saved.name || saved.song.name;
            setMusicSource(saved.song);
            updateMusicCover(saved.cover);
            return;
        }
        if (!sharedMemories || !sharedMemories.music || !sharedMemories.music.song) return;

        const songPath = sharedMemories.music.song.path;
        const coverPath = sharedMemories.music.cover && sharedMemories.music.cover.path;
        selectedMusicEl.textContent = sharedMemories.text && sharedMemories.text.songTitle
            ? sharedMemories.text.songTitle
            : 'Our song';
        setMusicSource(songPath);
        if (coverPath && musicCoverEl && musicIconEl) {
            if (musicCoverUrl) URL.revokeObjectURL(musicCoverUrl);
            musicCoverUrl = null;
            currentMusicCover = null;
            musicCoverEl.src = coverPath;
            musicCoverEl.hidden = false;
            musicIconEl.hidden = true;
            try {
                const response = await fetch(coverPath);
                if (!response.ok) throw new Error(`Could not load cover image (${response.status}).`);
                currentMusicCover = await response.blob();
            } catch (error) {
                setMusicStatus(`${error.message} The cover will not be included if you replace the song.`);
            }
        }
    }).catch(error => setMusicStatus(`${error.message} Select a song to use the player.`));

    musicInput.addEventListener('change', async () => {
        const file = musicInput.files && musicInput.files[0];
        musicInput.value = '';
        if (!file) {
            setMusicStatus('No music file selected.');
            return;
        }
        if (!file.type.startsWith('audio/')) {
            setMusicStatus('Please select a supported audio file.');
            return;
        }
        await musicReady;
        selectedMusicEl.textContent = file.name;
        setMusicSource(file);
        try {
            await saveMusicSelection(file, currentMusicCover);
            setMusicStatus('Song selected and saved on this device.');
        } catch (error) {
            setMusicStatus(`${error.message} The song is available until you leave this page.`);
        }
    });

    if (musicCoverInput) {
        musicCoverInput.addEventListener('change', async () => {
            const file = musicCoverInput.files && musicCoverInput.files[0];
            musicCoverInput.value = '';
            if (!file) {
                setMusicStatus('No cover image selected.');
                return;
            }
            if (!file.type.startsWith('image/')) {
                setMusicStatus('Please select a valid image for the cover.');
                return;
            }
            await musicReady;
            updateMusicCover(file);
            try {
                const saved = await loadMusicSelection();
                if (saved) await saveMusicSelection(saved.song, file);
                setMusicStatus(saved ? 'Cover image saved on this device.' : 'Cover selected. Choose a song to save both.');
            } catch (error) {
                setMusicStatus(`${error.message} The cover is available until you leave this page.`);
            }
        });
    }
    audioPlayer.addEventListener('error', () => {
        setMusicStatus('This audio file could not be played in this browser. Try another format.');
    });
    if (musicCoverEl) {
        musicCoverEl.addEventListener('error', () => {
            musicCoverEl.hidden = true;
            musicIconEl.hidden = false;
            setMusicStatus('The cover image could not be displayed. Showing the default music icon.');
        });
    }
}

// Surprise
const surpriseBox = document.getElementById('surpriseBox');
const surpriseContent = document.getElementById('surpriseContent');
const surpriseRevealed = document.getElementById('surpriseRevealed');
const surpriseMessageEl = surpriseRevealed ? surpriseRevealed.querySelector('.surprise-message') : null;
if (surpriseMessageEl) {
    surpriseMessageEl.textContent = DEFAULT_SURPRISE_MESSAGE;
}
if (surpriseBox) {
    surpriseBox.addEventListener('click', () => {
        if (surpriseContent && surpriseRevealed) {
            if (surpriseContent.style.display !== 'none') {
                surpriseContent.style.display = 'none';
                surpriseRevealed.style.display = 'block';
            } else {
                surpriseContent.style.display = 'block';
                surpriseRevealed.style.display = 'none';
            }
        }
    });
    surpriseBox.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            surpriseBox.click();
        }
    });
}

// Animations
const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);
document.querySelectorAll('.section').forEach((section, index) => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(30px)';
    section.style.transition = 'opacity 0.8s ease-out ' + (index * 0.1) + 's, transform 0.8s ease-out ' + (index * 0.1) + 's';
    observer.observe(section);
});
document.querySelectorAll('.photo-card, .timeline-item, .counter-card, .letter-card, .music-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    observer.observe(el);
});

// Init
document.addEventListener('DOMContentLoaded', () => {
    sharedMemoriesReady.then(initCounter);
    console.log('NarNory Scrapbook initialized! ❤️');
});
