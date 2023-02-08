console.log('inject.js');

document.addEventListener('ET_blur_input', event => {
  console.log('trigger blur on input ' + event.detail);
  const el = document.querySelectorAll('[data-etoro-automation-id="input"]')[event.detail];
  angular.element(el).triggerHandler('change')
  angular.element(el).triggerHandler('blur')
})
