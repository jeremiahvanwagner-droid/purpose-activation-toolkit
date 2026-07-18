// script.js – client side logic for the Purpose Activation Toolkit

document.addEventListener('DOMContentLoaded', () => {
    const TOKEN_KEYS = {
        access: 'access_token',
        refresh: 'refresh_token'
    };

    const setStatus = (element, message, isError = false) => {
        if (!element) {
            return;
        }
        element.textContent = message;
        element.style.display = 'block';
        element.classList.toggle('error', isError);
    };

    const clearStatus = (element) => {
        if (!element) {
            return;
        }
        element.textContent = '';
        element.style.display = 'none';
        element.classList.remove('error');
    };

    const storeTokens = (payload) => {
        if (!payload) {
            return;
        }
        if (payload.access_token) {
            localStorage.setItem(TOKEN_KEYS.access, payload.access_token);
        }
        if (payload.refresh_token) {
            localStorage.setItem(TOKEN_KEYS.refresh, payload.refresh_token);
        }
    };

    const clearTokens = () => {
        localStorage.removeItem(TOKEN_KEYS.access);
        localStorage.removeItem(TOKEN_KEYS.refresh);
    };

    const getAccessToken = () => localStorage.getItem(TOKEN_KEYS.access);
    const getRefreshToken = () => localStorage.getItem(TOKEN_KEYS.refresh);

    const refreshAccessToken = async () => {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
            return false;
        }

        const res = await fetch('/api/token/refresh', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${refreshToken}`
            }
        });

        if (!res.ok) {
            clearTokens();
            return false;
        }

        const data = await res.json();
        storeTokens(data);
        return true;
    };

    const apiFetch = async (url, options = {}, config = {}) => {
        const { auth = false, retryOnUnauthorized = true } = config;
        const headers = new Headers(options.headers || {});
        const hasBody = options.body !== undefined && options.body !== null;
        if (hasBody && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }

        const accessToken = getAccessToken();
        if (auth && accessToken) {
            headers.set('Authorization', `Bearer ${accessToken}`);
        }

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (response.status === 401 && auth && retryOnUnauthorized) {
            const refreshed = await refreshAccessToken();
            if (refreshed) {
                return apiFetch(url, options, { auth, retryOnUnauthorized: false });
            }
        }

        if (response.status === 204) {
            return null;
        }

        const contentType = response.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');
        const data = isJson ? await response.json() : await response.text();

        if (!response.ok) {
            const message =
                (data && data.detail) ||
                (data && data.message) ||
                (typeof data === 'string' && data.trim() ? data : `Request failed with status ${response.status}`);
            throw new Error(message);
        }

        return data;
    };

    // Login handling
    const loginForm = document.getElementById('login-form');
    const loginStatus = document.getElementById('login-status');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearStatus(loginStatus);
            const username = document.getElementById('login-username')?.value;
            const password = document.getElementById('login-password')?.value;
            if (!username || !password) {
                setStatus(loginStatus, 'Please enter both username and password.', true);
                return;
            }

            try {
                const data = await apiFetch('/api/token', {
                    method: 'POST',
                    body: JSON.stringify({ username, password })
                });
                storeTokens(data);
                setStatus(loginStatus, 'Logged in successfully.');
                loginForm.reset();
            } catch (err) {
                setStatus(loginStatus, `Login failed: ${err.message}`, true);
            }
        });
    }

    const refreshTokenButton = document.getElementById('refresh-token');
    if (refreshTokenButton) {
        refreshTokenButton.addEventListener('click', async () => {
            clearStatus(loginStatus);
            const refreshed = await refreshAccessToken();
            if (refreshed) {
                setStatus(loginStatus, 'Session refreshed.');
            } else {
                setStatus(loginStatus, 'Unable to refresh session. Please log in again.', true);
            }
        });
    }

    // Intention form submission
    const intentionForm = document.getElementById('intention‑form');
    const intentionResponse = document.getElementById('intention‑response');

    if (intentionForm) {
        intentionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const statement = document.getElementById('intention‑statement').value;
            clearStatus(intentionResponse);
            try {
                const data = await apiFetch('/api/intent', {
                    method: 'POST',
                    body: JSON.stringify({ statement })
                });
                setStatus(intentionResponse, data.message || 'Intention received.');
            } catch (err) {
                setStatus(intentionResponse, `Error: ${err.message}`, true);
            }
        });
    }

    // Audit form submission
    const auditForm = document.getElementById('audit‑form');
    const auditResults = document.getElementById('audit‑results');
    if (auditForm) {
        auditForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            // Gather responses from selects
            const selects = auditForm.querySelectorAll('select');
            const responses = Array.from(selects).map(sel => parseInt(sel.value, 10));
            clearStatus(auditResults);
            try {
                const data = await apiFetch('/api/audit', {
                    method: 'POST',
                    body: JSON.stringify(responses)
                });
                auditResults.innerHTML = `<strong>Score:</strong> ${data.score}<br><strong>Description:</strong> ${data.description}<br>`;
                if (data.mentorship_recommended) {
                    auditResults.innerHTML += '<em>Mentorship is recommended based on your score.</em>';
                }
                auditResults.style.display = 'block';
            } catch (err) {
                setStatus(auditResults, `Error: ${err.message}`, true);
            }
        });
    }

    // Load resources button
    const loadResourcesBtn = document.getElementById('load‑resources');
    const resourcesList = document.getElementById('resources‑list');
    if (loadResourcesBtn) {
        loadResourcesBtn.addEventListener('click', async () => {
            if (!resourcesList) {
                return;
            }
            resourcesList.innerHTML = '';
            try {
                const data = await apiFetch('/api/resources');
                data.resources.forEach(item => {
                    const li = document.createElement('li');
                    li.innerHTML = `<strong>${item.title}</strong> (${item.type}) – ${item.description}`;
                    resourcesList.appendChild(li);
                });
            } catch (err) {
                if (resourcesList) {
                    resourcesList.innerHTML = `<li>Error: ${err.message}</li>`;
                }
            }
        });
    }

    // Assessments
    const assessmentsList = document.getElementById('assessments-list');
    const assessmentsStatus = document.getElementById('assessments-status');
    const loadAssessmentsBtn = document.getElementById('load-assessments');

    const renderAssessments = (assessments = []) => {
        if (!assessmentsList) {
            return;
        }
        assessmentsList.innerHTML = '';
        assessments.forEach((assessment) => {
            const li = document.createElement('li');
            const title = assessment.title || assessment.name || 'Assessment';
            const description = assessment.description ? `<p>${assessment.description}</p>` : '';
            const link = assessment.url || assessment.link;
            li.innerHTML = `<strong>${title}</strong>${description}`;
            if (link) {
                const anchor = document.createElement('a');
                anchor.href = link;
                anchor.target = '_blank';
                anchor.rel = 'noopener noreferrer';
                anchor.textContent = 'Open assessment';
                li.appendChild(document.createElement('br'));
                li.appendChild(anchor);
            }
            assessmentsList.appendChild(li);
        });
    };

    const loadAssessments = async () => {
        clearStatus(assessmentsStatus);
        try {
            const data = await apiFetch('/api/assessments');
            const assessments = Array.isArray(data) ? data : data.assessments;
            renderAssessments(assessments || []);
            if (!assessments || assessments.length === 0) {
                setStatus(assessmentsStatus, 'No assessments available yet.');
            }
        } catch (err) {
            setStatus(assessmentsStatus, `Unable to load assessments: ${err.message}`, true);
        }
    };

    if (loadAssessmentsBtn) {
        loadAssessmentsBtn.addEventListener('click', loadAssessments);
    } else if (assessmentsList) {
        loadAssessments();
    }

    const assessmentForm = document.getElementById('assessment-form');
    const assessmentFeedback = document.getElementById('assessment-feedback');
    if (assessmentForm) {
        assessmentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearStatus(assessmentFeedback);
            const formData = new FormData(assessmentForm);
            const payload = Object.fromEntries(formData.entries());
            const submitUrl = assessmentForm.dataset.submitUrl || '/api/assessments/score';

            if (!payload.assessment_id || !payload.score) {
                setStatus(assessmentFeedback, 'Please provide an assessment and score.', true);
                return;
            }

            payload.assessment_id = Number(payload.assessment_id);
            payload.score = Number(payload.score);

            try {
                const data = await apiFetch(submitUrl, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                }, { auth: true });
                setStatus(assessmentFeedback, data.message || 'Score submitted.');
                assessmentForm.reset();
            } catch (err) {
                setStatus(assessmentFeedback, `Unable to submit score: ${err.message}`, true);
            }
        });
    }

    // Integrations
    const integrationsList = document.getElementById('integrations-list');
    const integrationsStatus = document.getElementById('integrations-status');
    const loadIntegrationsBtn = document.getElementById('load-integrations');

    const renderIntegrations = (integrations = []) => {
        if (!integrationsList) {
            return;
        }
        integrationsList.innerHTML = '';
        integrations.forEach((integration) => {
            const li = document.createElement('li');
            const name = integration.name || integration.title || 'Integration';
            const url = integration.url || integration.link;
            li.innerHTML = `<strong>${name}</strong>`;
            if (integration.description) {
                li.innerHTML += ` – ${integration.description}`;
            }
            if (url) {
                const anchor = document.createElement('a');
                anchor.href = url;
                anchor.target = '_blank';
                anchor.rel = 'noopener noreferrer';
                anchor.textContent = 'Open link';
                li.appendChild(document.createElement('br'));
                li.appendChild(anchor);
            }
            integrationsList.appendChild(li);
        });
    };

    const loadIntegrations = async () => {
        clearStatus(integrationsStatus);
        try {
            const data = await apiFetch('/api/integrations');
            const integrations = Array.isArray(data) ? data : data.integrations;
            renderIntegrations(integrations || []);
            if (!integrations || integrations.length === 0) {
                setStatus(integrationsStatus, 'No integrations available yet.');
            }
        } catch (err) {
            setStatus(integrationsStatus, `Unable to load integrations: ${err.message}`, true);
        }
    };

    if (loadIntegrationsBtn) {
        loadIntegrationsBtn.addEventListener('click', loadIntegrations);
    } else if (integrationsList) {
        loadIntegrations();
    }

    // Reminder triggers
    const reminderForm = document.getElementById('reminder-form');
    const reminderStatus = document.getElementById('reminder-status');

    const triggerReminder = async ({ journeyId, reminderType, statusElement }) => {
        if (!journeyId) {
            setStatus(statusElement, 'Journey ID is required to send a reminder.', true);
            return;
        }
        try {
            const data = await apiFetch(`/api/reminders/${journeyId}`, {
                method: 'POST',
                body: JSON.stringify({ reminder_type: reminderType || 'weekly_email' })
            }, { auth: true });
            setStatus(statusElement, data.message || 'Reminder queued.');
        } catch (err) {
            setStatus(statusElement, `Unable to queue reminder: ${err.message}`, true);
        }
    };

    if (reminderForm) {
        reminderForm.addEventListener('submit', (e) => {
            e.preventDefault();
            clearStatus(reminderStatus);
            const formData = new FormData(reminderForm);
            const journeyId = formData.get('journey_id');
            const reminderType = formData.get('reminder_type');
            triggerReminder({
                journeyId,
                reminderType,
                statusElement: reminderStatus
            });
        });
    }

    const reminderButtons = document.querySelectorAll('[data-reminder-journey]');
    reminderButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const journeyId = button.dataset.reminderJourney;
            const reminderType = button.dataset.reminderType || 'weekly_email';
            const statusTargetId = button.dataset.reminderStatus;
            const statusElement = statusTargetId
                ? document.getElementById(statusTargetId)
                : reminderStatus;
            clearStatus(statusElement);
            triggerReminder({
                journeyId,
                reminderType,
                statusElement
            });
        });
    });
});
