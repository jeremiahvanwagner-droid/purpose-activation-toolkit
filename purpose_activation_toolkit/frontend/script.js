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

    // Assessments rendering and submission
    const assessmentsContainer = document.getElementById('assessments‑container');

    const renderAssessments = async () => {
        assessmentsContainer.innerHTML = '<p>Loading assessments…</p>';
        try {
            const res = await fetch('/api/assessments');
            if (!res.ok) {
                throw new Error('Unable to load assessments.');
            }
            const data = await res.json();
            assessmentsContainer.innerHTML = '';
            data.assessments.forEach((assessment) => {
                const card = document.createElement('article');
                card.className = 'assessment‑card';

                const heading = document.createElement('h3');
                heading.textContent = assessment.name;
                card.appendChild(heading);

                const logic = document.createElement('p');
                logic.className = 'assessment‑logic';
                logic.textContent = assessment.scoring_logic;
                card.appendChild(logic);

                const form = document.createElement('form');
                form.className = 'assessment‑form';
                form.dataset.assessmentId = assessment.id;

                assessment.questions.forEach((question, index) => {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'quiz‑question';

                    const label = document.createElement('label');
                    label.textContent = `${index + 1}. ${question}`;
                    wrapper.appendChild(label);

                    const select = document.createElement('select');
                    select.setAttribute('aria-label', question);

                    for (let value = assessment.scale.min; value <= assessment.scale.max; value += 1) {
                        const option = document.createElement('option');
                        const labelText = assessment.scale.labels?.[String(value)];
                        option.value = String(value);
                        option.textContent = labelText ? `${value} - ${labelText}` : String(value);
                        select.appendChild(option);
                    }

                    wrapper.appendChild(select);
                    form.appendChild(wrapper);
                });

                const submitButton = document.createElement('button');
                submitButton.type = 'submit';
                submitButton.textContent = 'Get Results';
                form.appendChild(submitButton);

                const results = document.createElement('div');
                results.className = 'response assessment‑results';

                form.addEventListener('submit', async (event) => {
                    event.preventDefault();
                    const selects = form.querySelectorAll('select');
                    const responses = Array.from(selects).map((select) => parseInt(select.value, 10));
                    results.style.display = 'none';
                    try {
                        const scoreRes = await fetch(`/api/assessments/${assessment.id}/score`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ responses })
                        });
                        if (!scoreRes.ok) {
                            const error = await scoreRes.json();
                            throw new Error(error.detail || 'Assessment submission failed.');
                        }
                        const scoreData = await scoreRes.json();
                        results.innerHTML = `
                            <strong>Score:</strong> ${scoreData.score} / ${scoreData.max_score}<br>
                            <strong>Average:</strong> ${scoreData.average}<br>
                            <strong>Interpretation:</strong> ${scoreData.interpretation}<br>
                            <strong>Guidance:</strong> ${scoreData.guidance}
                        `;
                        results.style.display = 'block';
                    } catch (err) {
                        results.textContent = `Error: ${err.message}`;
                        results.style.display = 'block';
                    }
                });

                card.appendChild(form);
                card.appendChild(results);
                assessmentsContainer.appendChild(card);
            });
        } catch (err) {
            assessmentsContainer.innerHTML = `<p class="error">Error: ${err.message}</p>`;
        }
    };

    renderAssessments();

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
});
