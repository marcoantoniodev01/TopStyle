/*=============== SERVICES MODAL ===============*/

const modal = document.getElementById("nav-menu");
const abrir = document.getElementById("burger");
const fechar = document.getElementById("nav-close");

abrir.onclick = () => {
    modal.classList.add("active");
    abrir.classList.add("active");
}

fechar.onclick = () => {
    modal.classList.remove("active");
    abrir.classList.remove("active");
}