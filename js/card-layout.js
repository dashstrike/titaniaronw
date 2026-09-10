/* Pack variable-height cards without changing their contents or listeners. */
window.TitaniaCardLayout = function(grid, selector){
  if(!grid || !window.ResizeObserver)return null;
  const cards=[...grid.querySelectorAll(selector)];
  if(!cards.length)return null;
  grid.classList.add('is-packed');
  const fit=card=>{
    // Eight-pixel grid units with at least 16px between cards.
    const rows=Math.ceil((card.getBoundingClientRect().height+16)/8);
    const span='span '+Math.max(1,rows);
    if(card.style.gridRowEnd!==span)card.style.gridRowEnd=span;
  };
  const observer=new ResizeObserver(entries=>entries.forEach(entry=>fit(entry.target)));
  cards.forEach(card=>{fit(card);observer.observe(card);});
  return observer;
};
