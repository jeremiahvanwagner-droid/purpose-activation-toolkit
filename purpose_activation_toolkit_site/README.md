# Purpose Activation Toolkit Site

This folder contains a simple static website that accompanies the **Purpose Activation Toolkit**.  
The site is designed to be hosted on any static web server (e.g. GitHub Pages or Branch.io) and
provides an accessible overview of the toolkit and an example of the Purpose Scorecard results page.

## Files and Structure

* **index.html** – the main landing page. It summarises the mission and vision, introduces the
  science of intention, links to the discovery workbook and activation practices, and invites
  visitors to explore a sample scorecard.
* **scorecard.html** – a sample results page for the Purpose Scorecard. It highlights the top and
  bottom scoring domains and offers pop‑up guidance for each domain. This page uses simple
  JavaScript to display descriptions when users click the “+” button.
* **style.css** – shared styles for the site, including colours, typography and layout.  You can
  modify this file to customise the look and feel of the site.
* **README.md** – this documentation.

## Hosting

To deploy this site, upload the contents of this folder to your hosting provider.  
The presence of an `index.html` at the root will satisfy hosting services that require a
recognised project structure.  
No additional build step is necessary; the pages are plain HTML, CSS and JavaScript.

## Customising the Scorecard

The sample results page is intended as a starting point.  In a real application you might
generate the top and bottom domains dynamically based on user input or integrate with a backend
service.  To customise the descriptions or threshold logic, update the `domainInfo` object in
`scorecard.html` and adjust the HTML structure accordingly.

## License

This project is provided as part of the Purpose Activation Toolkit.  You may modify and adapt it
for personal or commercial use, but please retain attribution to Truth J Blue LLC where
appropriate.