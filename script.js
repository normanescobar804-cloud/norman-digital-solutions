document.addEventListener('DOMContentLoaded', function () {
	const form = document.getElementById('contactForm');
	const status = document.getElementById('formStatus');

	if (!form) return;

	form.addEventListener('submit', async function (e) {
		e.preventDefault();
		const name = document.getElementById('name').value.trim();
		const email = document.getElementById('email').value.trim();
		const subject = document.getElementById('subject').value.trim() || 'Solicitud de asesoría';
		const message = document.getElementById('message').value.trim();

		if (!name || !email || !message) {
			status.textContent = 'Por favor completa los campos requeridos.';
			status.style.color = 'red';
			return;
		}

		const submitButton = form.querySelector('button[type="submit"]');
		submitButton.disabled = true;
		status.textContent = 'Enviando solicitud...';
		status.dataset.state = 'loading';

		try {
			const res = await fetch('/api/requests', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, email, subject, message })
			});
			const result = await res.json();
			if (!res.ok) throw new Error(result.error || 'No se pudo enviar la solicitud.');

			status.textContent = 'Solicitud enviada. Gracias; pronto me pondré en contacto contigo.';
			status.dataset.state = 'success';
			form.reset();
		} catch (error) {
			console.error('No se pudo enviar la solicitud de contacto:', error);
			status.textContent = error instanceof Error
				? error.message
				: 'No se pudo enviar la solicitud. Inténtalo de nuevo o contáctame por WhatsApp.';
			status.dataset.state = 'error';
		} finally {
			submitButton.disabled = false;
		}
	});
});
