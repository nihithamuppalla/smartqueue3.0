// --- Database / Queue Mocks ---
// We simulate queues for different departments.
let hospitalQueues = {
    "General OPD": [{ token: 101, priority: 3 }, { token: 102, priority: 3 }],
    "Cardiology": [{ token: 201, priority: 2 }, { token: 202, priority: 3 }],
    "Orthopedics": [{ token: 301, priority: 2 }],
    "Trauma & Surgery": [{ token: 401, priority: 1 }],
    "Disaster Triage Unit": [] // Kept clear for mass casualties
};

let globalTokenCounter = 500;
let currentUserState = null;
const TIME_PER_PATIENT_MINS = 8; // Average consultation time

// --- UI Elements ---
const incidentTypeSelect = document.getElementById('incident-type');
const animalDetailsGroup = document.getElementById('animal-details-group');
const triageForm = document.getElementById('triage-form');

// Toggle Animal Dropdown based on Incident selection
incidentTypeSelect.addEventListener('change', function(e) {
    if (e.target.value === 'animal') {
        animalDetailsGroup.classList.remove('hidden');
    } else {
        animalDetailsGroup.classList.add('hidden');
    }
});

// --- Artificial Intelligence Triage Engine (Simulated) ---
async function runAIAssessment(data) {
    /* * HOW TO INTEGRATE A REAL API HERE:
     * try {
     * const response = await fetch('https://api.your-backend.com/v1/triage', {
     * method: 'POST',
     * headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer YOUR_SECURE_TOKEN' },
     * body: JSON.stringify(data)
     * });
     * return await response.json(); 
     * } catch(e) { console.error("API failed, falling back to local simulation"); }
     */

    // --- LOCAL SIMULATION LOGIC ---
    let priority = 3; // 3: Routine, 2: Urgent, 1: Emergency
    let department = "General OPD";
    let doctor = "Dr. Ramesh (General Physician)";
    let text = data.symptoms.toLowerCase();

    // 1. Natural Disaster / Mass Casualty Override (Absolute Highest Priority)
    if (data.isDisaster) {
        return { priority: 1, department: "Disaster Triage Unit", doctor: "ER Response Team Alpha", notes: "Mass Casualty Protocol Active" };
    }

    // 2. Animal Attack Routing
    if (data.incidentType === 'animal') {
        if (data.animalType === 'snake' || data.animalType === 'wild') {
            return { priority: 1, department: "Trauma & Surgery", doctor: "Dr. Ali (Toxicology/Surgery)", notes: "High-risk venom/trauma potential." };
        } else {
            return { priority: 2, department: "General OPD", doctor: "Dr. Ramesh (General Physician)", notes: "Requires Rabies protocol & wound care." };
        }
    }

    // 3. Cardiology / Heart Routing
    if (data.incidentType === 'heart' || text.includes('heart') || text.includes('chest') || text.includes('breath')) {
        return { priority: 1, department: "Cardiology", doctor: "Dr. Sharma (Chief Cardiologist)", notes: "Potential Cardiac Event." };
    }

    // 4. Orthopedics / Bone Routing
    if (data.incidentType === 'bone' || text.includes('bone') || text.includes('fracture') || text.includes('broken')) {
        return { priority: 2, department: "Orthopedics", doctor: "Dr. Gupta (Orthopedic Surgeon)", notes: "Suspected fracture/trauma." };
    }

    return { priority, department, doctor, notes: "Routine assessment." };
}

// --- Form Submission ---
triageForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    document.getElementById('submit-btn').innerText = "AI is Assessing Data...";
    document.getElementById('submit-btn').disabled = true;

    // Gather Patient Data
    const patientData = {
        name: document.getElementById('patient-name').value,
        phone: document.getElementById('patient-phone').value,
        isDisaster: document.getElementById('disaster-flag').checked,
        incidentType: document.getElementById('incident-type').value,
        animalType: document.getElementById('animal-type').value,
        symptoms: document.getElementById('symptoms').value,
        hasFile: document.getElementById('medical-file').files.length > 0
    };

    // 1. Get AI Result
    const aiResult = await runAIAssessment(patientData);

    // 2. Create User Token Profile
    currentUserState = {
        token: globalTokenCounter++,
        name: patientData.name,
        ...aiResult
    };

    // 3. Insert into the correct Department Queue based on Priority
    let deptQueue = hospitalQueues[currentUserState.department];
    let insertIndex = deptQueue.findIndex(p => p.priority > currentUserState.priority);
    
    if (insertIndex === -1) {
        deptQueue.push(currentUserState); // Go to back of the line
    } else {
        deptQueue.splice(insertIndex, 0, currentUserState); // Skip ahead of lower priorities
    }

    // 4. Switch Screens
    document.getElementById('triage-screen').classList.add('hidden');
    document.getElementById('tracker-screen').classList.remove('hidden');
    
    updateTrackerUI();
});

// --- Live Tracker Engine ---
function updateTrackerUI() {
    if (!currentUserState) return;

    const deptQueue = hospitalQueues[currentUserState.department];
    const myIndex = deptQueue.findIndex(p => p.token === currentUserState.token);
    const currentlyServing = deptQueue.length > 0 ? deptQueue[0] : null;

    // Update Header
    document.getElementById('assigned-dept').innerText = currentUserState.department;
    document.getElementById('assigned-doc').innerText = currentUserState.doctor;

    // Update Badges & Colors
    document.getElementById('my-token-display').innerText = "#" + currentUserState.token;
    document.getElementById('my-turn-token').innerText = "Token #" + currentUserState.token;
    
    const badge = document.getElementById('priority-badge');
    const myStationBox = document.getElementById('my-station-box');

    if (currentUserState.priority === 1) {
        badge.innerText = "EMERGENCY (P1)";
        badge.className = "badge priority-1";
        myStationBox.classList.add("emergency-bg");
    } else if (currentUserState.priority === 2) {
        badge.innerText = "URGENT (P2)";
        badge.className = "badge priority-2";
        myStationBox.classList.remove("emergency-bg");
    } else {
        badge.innerText = "ROUTINE (P3)";
        badge.className = "badge priority-3";
        myStationBox.classList.remove("emergency-bg");
    }

    // Update Tracking Math
    document.getElementById('current-token').innerText = currentlyServing ? "Token #" + currentlyServing.token : "Idle";
    
    const waitTimeDisplay = document.getElementById('wait-time');
    const distanceDisplay = document.getElementById('distance-text');

    if (myIndex > 0) {
        // People are ahead
        waitTimeDisplay.innerText = (myIndex * TIME_PER_PATIENT_MINS) + " mins";
        waitTimeDisplay.style.color = "#059669";
        
        if (currentUserState.priority === 1) {
            distanceDisplay.innerText = `${myIndex} patient(s) ahead. You have been FAST-TRACKED.`;
        } else {
            distanceDisplay.innerText = `${myIndex} patient(s) ahead of you.`;
        }
    } else if (myIndex === 0) {
        // It's their turn
        waitTimeDisplay.innerText = "NOW!";
        waitTimeDisplay.style.color = "#dc2626";
        distanceDisplay.innerText = "Proceed to the Doctor's Cabin immediately.";
    } else {
        // Finished
        waitTimeDisplay.innerText = "DONE";
        waitTimeDisplay.style.color = "#64748b";
        distanceDisplay.innerText = "Consultation Complete.";
    }
}

// Admin Button to simulate the line moving forward
document.getElementById('next-btn').addEventListener('click', function() {
    if (currentUserState) {
        let deptQueue = hospitalQueues[currentUserState.department];
        if (deptQueue.length > 0) {
            deptQueue.shift(); // Remove the person currently seeing the doctor
            updateTrackerUI();
        }
    }
});