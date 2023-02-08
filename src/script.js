
console.log('script.js')

const pollInterval = 1000 * 10; // millis

function main() {
  console.log('hello');
  setTimeout(main, pollInterval);
}

console.log('starting up')
//
// $(document).ready(function(){
//   $("p").click(function(){
//     $(this).hide();
//   });
//   main();
// });
