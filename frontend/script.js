// script.js – client side logic for the Purpose Activation Toolkit

document.addEventListener('DOMContentLoaded', () => {
    // Intention form submission
    const intentionForm = document.getElementById('intention‑form');
    const intentionResponse = document.getElementById('intention‑response');

    intentionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const statement = document.getElementById('intention‑statement').value;
        intentionResponse.style.display = 'none';
        try {
            const res = await fetch('/api/intent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ statement })
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.detail || 'Submission failed');
            }
            const data = await res.json();
            intentionResponse.textContent = data.message;
            intentionResponse.style.display = 'block';
        } catch (err) {
            intentionResponse.textContent = `Error: ${err.message}`;
            intentionResponse.style.display = 'block';
        }
    });

    // Audit form submission
    const auditForm = document.getElementById('audit‑form');
    const auditResults = document.getElementById('audit‑results');
    auditForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Gather responses from selects
        const selects = auditForm.querySelectorAll('select');
        const responses = Array.from(selects).map(sel => parseInt(sel.value));
        auditResults.style.display = 'none';
        try {
            const res = await fetch('/api/audit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(responses)
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.detail || 'Audit submission failed');
            }
            const data = await res.json();
            auditResults.innerHTML = `<strong>Score:</strong> ${data.score}<br><strong>Description:</strong> ${data.description}<br>`;
            if (data.mentorship_recommended) {
                auditResults.innerHTML += '<em>Mentorship is recommended based on your score.</em>';
            }
            auditResults.style.display = 'block';
        } catch (err) {
            auditResults.textContent = `Error: ${err.message}`;
            auditResults.style.display = 'block';
        }
    });

    // Load resources button
    const loadResourcesBtn = document.getElementById('load‑resources');
    const resourcesList = document.getElementById('resources‑list');
    loadResourcesBtn.addEventListener('click', async () => {
        resourcesList.innerHTML = '';
        try {
            const res = await fetch('/api/resources');
            if (!res.ok) {
                throw new Error('Failed to load resources');
            }
            const data = await res.json();
            data.resources.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `<strong>${item.title}</strong> (${item.type}) – ${item.description}`;
                resourcesList.appendChild(li);
            });
        } catch (err) {
            resourcesList.innerHTML = `<li>Error: ${err.message}</li>`;
        }
    });

    // Load integration links for CTAs
    const integrationsGrid = document.getElementById('integrations‑grid');
    const renderIntegrationError = (message) => {
        integrationsGrid.innerHTML = `<p class="cta-error">Error: ${message}</p>`;
    };

    const renderIntegrations = (integrations) => {
        integrationsGrid.innerHTML = '';
        integrations.forEach(item => {
            const card = document.createElement('div');
            card.classList.add('cta-card');
            card.innerHTML = `
                <h3>${item.label}</h3>
                <p>${item.description}</p>
                <a href="${item.url}" target="_blank" rel="noopener noreferrer">Visit</a>
            `;
            integrationsGrid.appendChild(card);
        });
    };

    const loadIntegrations = async () => {
        try {
            const res = await fetch('/api/integrations');
            if (!res.ok) {
                throw new Error('Failed to load integrations');
            }
            const data = await res.json();
            if (!data.integrations || !data.integrations.length) {
                renderIntegrationError('No integrations available right now.');
                return;
            }
            renderIntegrations(data.integrations);
        } catch (err) {
            renderIntegrationError(err.message);
        }
    };

    loadIntegrations();
});
