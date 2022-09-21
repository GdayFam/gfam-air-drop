console.log('Renderer On...');

let message = 'Hello World';

const func = async () => {
  console.log('Channel On...');
  const response = await window.versions.ping();
  message = response;
  console.log(response);
};

func();

const information = document.getElementById('info');
information.innerText = `This app is using Chrome (v${versions.chrome()}), Node.js (v${versions.node()}), and Electron (v${versions.electron()})`;

const messageEl = document.getElementById('message');
messageEl.innerText = `Message: ${message}`;
