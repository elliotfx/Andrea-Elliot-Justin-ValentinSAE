// dataFetch.js

export async function fetchDoctorPerformance(doctorId, startDate, endDate) {
    const token = localStorage.getItem('token'); // Get JWT token from localStorage

    if (!token) {
        console.error('Utilisateur non authentifié');
        window.location.href = 'login.html'; // Redirect to login page if no token
        return;
    }
    const response = await fetch(`/api/doctor-performance?doctorId=${doctorId}&startDate=${startDate}&endDate=${endDate}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`, // Add JWT token to Authorization header
            'Content-Type': 'application/json'
        }
    });
    return response.json();
};

export async function fetchMonthlyStats(doctorId, startDate, endDate) {
    const token = localStorage.getItem('token'); // Get JWT token from localStorage

    if (!token) {
        console.error('Utilisateur non authentifié');
        window.location.href = 'login.html'; // Redirect to login page if no token
        return;
    }
    const response = await fetch(`/api/doctor/monthly-stats?doctorId=${doctorId}&startDate=${startDate}&endDate=${endDate}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`, // Add JWT token to Authorization header
            'Content-Type': 'application/json'
        }
    });
    return response.json();
};
export async function fetchTimeData(doctorId, startDate, endDate) {
    const token = localStorage.getItem('token'); // Get JWT token from localStorage

    if (!token) {
        console.error('Utilisateur non authentifié');
        window.location.href = 'login.html'; // Redirect to login page if no token
        return;
    }
    const response = await fetch(`/api/doctor-time-analysis?doctorId=${doctorId}&startDate=${startDate}&endDate=${endDate}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`, // Add JWT token to Authorization header
            'Content-Type': 'application/json'
        }
    });
    return response.json();
};

export async function fetchWaitingTimeHeatmapData(doctorId, startDate, endDate) {
    const token = localStorage.getItem('token'); // Get JWT token from localStorage

    if (!token) {
        console.error('Utilisateur non authentifié');
        window.location.href = 'login.html'; // Redirect to login page if no token
        return;
    }
    const response = await fetch(`/api/waiting-times-heatmap-doctor?doctorId=${doctorId}&start=${startDate}&end=${endDate}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`, // Add JWT token to Authorization header
            'Content-Type': 'application/json'
        }
    });
    return response.json();
};

export async function fetchVisitRevenueData(doctorId, startDate, endDate) {
    const token = localStorage.getItem('token'); // Get JWT token from localStorage

    if (!token) {
        console.error('Utilisateur non authentifié');
        window.location.href = 'login.html'; // Redirect to login page if no token
        return;
    }
    const response = await fetch(`/api/visits-revenue?doctorId=${doctorId}&start-date=${startDate}&end-date=${endDate}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`, // Add JWT token to Authorization header
            'Content-Type': 'application/json'
        }
    });
    return response.json();
};
