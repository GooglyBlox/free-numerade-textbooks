let books = [];
let selectedBook = null;
let currentPage = 0;
const BOOKS_PER_PAGE = 24;

async function fetchBooks() {
  try {
    const booksGrid = document.getElementById("booksGrid");
    booksGrid.innerHTML = '<div class="loading-message">Loading books...</div>';

    const response = await fetch("/api/getBooksList");
    if (!response.ok) {
      throw new Error("Failed to fetch books");
    }
    const data = await response.json();
    books = data.books;

    books.forEach((book) => {
      book.searchText = `${book.title.toLowerCase()} ${book.author.toLowerCase()}`;
    });

    renderBooks(books);
    setupInfiniteScroll();
  } catch (error) {
    showError("Failed to load books");
  }
}

function createBookCard(book) {
  const bookCard = document.createElement("div");
  bookCard.className = "book-card";
  bookCard.onclick = () => handleBookSelect(book);

  bookCard.innerHTML = `
    <img 
      loading="lazy"
      src="https://s3-us-west-1.amazonaws.com/com.numerade/books/${book.image_url}"
      alt="${book.title}"
      class="book-cover"
      onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22><rect width=%221%22 height=%221%22 fill=%22%23374151%22/></svg>'"
    />
    <div class="book-info">
      <h3 class="book-title">${book.title}</h3>
      <p class="book-author">by ${book.author}</p>
      <p class="book-edition">Edition: ${book.edition}</p>
    </div>
  `;

  return bookCard;
}

function renderBooks(booksToRender) {
  const booksGrid = document.getElementById("booksGrid");
  const start = currentPage * BOOKS_PER_PAGE;
  const end = start + BOOKS_PER_PAGE;
  const visibleBooks = booksToRender.slice(start, end);

  if (currentPage === 0) {
    booksGrid.innerHTML = "";
  }

  const fragment = document.createDocumentFragment();
  visibleBooks.forEach((book) => {
    const bookCard = createBookCard(book);
    fragment.appendChild(bookCard);
  });

  if (booksToRender.length > end) {
    const sentinel = document.createElement("div");
    sentinel.id = "scroll-sentinel";
    fragment.appendChild(sentinel);
  }

  booksGrid.appendChild(fragment);
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

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const debouncedFilter = debounce((searchTerm) => {
  currentPage = 0;
  if (!searchTerm.trim()) {
    renderBooks(books);
    return;
  }

  const searchLower = searchTerm.toLowerCase();
  const filtered = books.filter((book) =>
    book.searchText.includes(searchLower)
  );
  renderBooks(filtered);
}, 300);

function setupInfiniteScroll() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          currentPage++;
          renderBooks(books);
        }
      });
    },
    {
      rootMargin: "100px",
    }
  );

  const sentinel = document.getElementById("scroll-sentinel");
  if (sentinel) {
    observer.observe(sentinel);
  }
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
  searchInput.addEventListener("input", (e) => debouncedFilter(e.target.value));
});
