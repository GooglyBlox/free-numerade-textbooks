let books = [];
let selectedBook = null;

async function fetchBooks() {
  try {
    const response = await fetch("/api/getBooksList");
    if (!response.ok) {
      throw new Error("Failed to fetch books");
    }
    const data = await response.json();
    books = data.books;
    renderBooks(books);
  } catch (error) {
    showError("Failed to load books");
  }
}

function renderBooks(booksToRender) {
  const booksGrid = document.getElementById("booksGrid");
  booksGrid.innerHTML = "";

  booksToRender.forEach((book) => {
    const bookCard = document.createElement("div");
    bookCard.className = "book-card";
    bookCard.onclick = () => handleBookSelect(book);

    bookCard.innerHTML = `
      <img 
        data-src="https://s3-us-west-1.amazonaws.com/com.numerade/books/${book.image_url}"
        alt="${book.title}"
        class="book-cover lazy"
        src="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22><rect width=%221%22 height=%221%22 fill=%22%23374151%22/></svg>"
        onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22><rect width=%221%22 height=%221%22 fill=%22%23374151%22/></svg>'"
      />
      <div class="book-info">
        <h3 class="book-title">${book.title}</h3>
        <p class="book-author">by ${book.author}</p>
        <p class="book-edition">Edition: ${book.edition}</p>
      </div>
    `;

    booksGrid.appendChild(bookCard);
  });

  initLazyLoading();
}

function initLazyLoading() {
  const lazyImages = document.querySelectorAll("img.lazy");

  const imageObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove("lazy");
          observer.unobserve(img);
        }
      });
    },
    {
      rootMargin: "50px 0px",
    }
  );

  lazyImages.forEach((img) => imageObserver.observe(img));
}

async function handleBookSelect(book) {
  selectedBook = book;
  showLoading();

  try {
    const response = await fetch("/api/getBooks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bookId: book.id }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch book");
    }

    const data = await response.json();
    showSuccess(book.title, data.pdfUrl);
  } catch (error) {
    showError("Failed to retrieve book PDF");
  } finally {
    hideLoading();
  }
}

function filterBooks(searchTerm) {
  const filtered = books.filter(
    (book) =>
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase())
  );
  renderBooks(filtered);
}

function showLoading() {
  document.getElementById("loadingOverlay").classList.remove("hidden");
}

function hideLoading() {
  document.getElementById("loadingOverlay").classList.add("hidden");
}

function showError(message) {
  const errorOverlay = document.getElementById("errorOverlay");
  const errorMessage = document.getElementById("errorMessage");
  errorMessage.textContent = message;
  errorOverlay.classList.remove("hidden");
}

function closeError() {
  document.getElementById("errorOverlay").classList.add("hidden");
}

function showSuccess(title, pdfUrl) {
  const successOverlay = document.getElementById("successOverlay");
  const successTitle = document.getElementById("successTitle");
  const pdfLink = document.getElementById("pdfLink");

  successTitle.textContent = title;
  pdfLink.href = pdfUrl;
  successOverlay.classList.remove("hidden");
}

function closeSuccess() {
  document.getElementById("successOverlay").classList.add("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  fetchBooks();

  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("input", (e) => filterBooks(e.target.value));
});
