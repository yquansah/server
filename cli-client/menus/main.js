async function main(states) {
  return states.EXIT;
}

module.exports = (states) => ({
  main: () => main(states),
});
