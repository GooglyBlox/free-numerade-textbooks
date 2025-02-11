let books = [];
let topics = [];
let curriculum = [];

async function fetchBooks() {
  try {
    const response = await fetch("/api/getBooksList");
    if (!response.ok) {
      throw new Error("Failed to fetch books");
    }
    const data = await response.json();
    books = data.books;
    topics = data.topics;
    curriculum = data.curriculum;

    populateFilters();
    renderBooks(books);
    setupMobileFilters();
  } catch (error) {
    showError("Failed to load books");
  }
}

function populateFilters() {
  const topicSelect = document.getElementById("topicSelect");
  const curriculumSelect = document.getElementById("curriculumSelect");

  topics.forEach((topic) => {
    const option = document.createElement("option");
    option.value = topic.id;
    option.textContent = topic.title;
    topicSelect.appendChild(option);
  });

  curriculum.forEach((curr) => {
    const option = document.createElement("option");
    option.value = curr.id;
    option.textContent = curr.title;
    curriculumSelect.appendChild(option);
  });
}

function updateResultsCount(count) {
  const resultsCount = document.getElementById("resultsCount");
  resultsCount.textContent =
    count === books.length ? "All Books" : `${count} Books Found`;
}

function updateActiveFilters(selectedTopics, selectedCurriculum) {
  const activeFilters = document.getElementById("activeFilters");
  activeFilters.innerHTML = "";

  selectedTopics.forEach((topicId) => {
    const topic = topics.find((t) => t.id === topicId);
    if (topic) {
      const filterTag = document.createElement("div");
      filterTag.className = "active-filter";
      filterTag.innerHTML = `
        ${topic.title}
        <button onclick="removeFilter('topic', ${topicId})">×</button>
      `;
      activeFilters.appendChild(filterTag);
    }
  });

  selectedCurriculum.forEach((currId) => {
    const curr = curriculum.find((c) => c.id === currId);
    if (curr) {
      const filterTag = document.createElement("div");
      filterTag.className = "active-filter";
      filterTag.innerHTML = `
        ${curr.title}
        <button onclick="removeFilter('curriculum', ${currId})">×</button>
      `;
      activeFilters.appendChild(filterTag);
    }
  });
}

function removeFilter(type, id) {
  const select = document.getElementById(
    type === "topic" ? "topicSelect" : "curriculumSelect"
  );
  const option = Array.from(select.options).find(
    (opt) => parseInt(opt.value) === id
  );
  if (option) {
    option.selected = false;
  }
  filterBooks();
}

function filterBooks() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  const selectedTopics = Array.from(
    document.getElementById("topicSelect").selectedOptions
  ).map((opt) => parseInt(opt.value));
  const selectedCurriculum = Array.from(
    document.getElementById("curriculumSelect").selectedOptions
  ).map((opt) => parseInt(opt.value));

  let filtered = books;

  if (searchTerm) {
    filtered = filtered.filter(
      (book) =>
        book.title.toLowerCase().includes(searchTerm) ||
        book.author.toLowerCase().includes(searchTerm)
    );
  }

  if (selectedTopics.length > 0) {
    filtered = filtered.filter((book) =>
      book.topics.some((topicId) => selectedTopics.includes(topicId))
    );
  }

  if (selectedCurriculum.length > 0) {
    filtered = filtered.filter((book) =>
      book.curriculum.some((currId) => selectedCurriculum.includes(currId))
    );
  }

  updateResultsCount(filtered.length);
  updateActiveFilters(selectedTopics, selectedCurriculum);
  renderBooks(filtered);
}

function renderBooks(booksToRender) {
  const booksGrid = document.getElementById("booksGrid");
  booksGrid.innerHTML = "";

  booksToRender.forEach((book) => {
    const bookCard = document.createElement("div");
    bookCard.className = "book-card";
    bookCard.onclick = () => handleBookSelect(book);

    const bookTopics = book.topics
      .map((topicId) => topics.find((t) => t.id === topicId)?.title)
      .filter(Boolean)
      .slice(0, 2);

    const bookCurriculum = book.curriculum
      .map((currId) => curriculum.find((c) => c.id === currId)?.title)
      .filter(Boolean)
      .join(", ");

    bookCard.innerHTML = `
      <img 
        data-src="https://s3-us-west-1.amazonaws.com/com.numerade/books/${
          book.image_url
        }"
        alt="${book.title}"
        class="book-cover lazy"
        src="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22><rect width=%221%22 height=%221%22 fill=%22%23374151%22/></svg>"
        onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22><rect width=%221%22 height=%221%22 fill=%22%23374151%22/></svg>'"
      />
      <div class="book-info">
        <h3 class="book-title">${book.title}</h3>
        <p class="book-author">by ${book.author}</p>
        <p class="book-edition">Edition: ${book.edition}</p>
        ${
          bookTopics.length
            ? `
          <div class="book-tags">
            ${bookTopics
              .map(
                (topic) => `
              <span class="book-tag">${topic}</span>
            `
              )
              .join("")}
            ${
              book.topics.length > 2
                ? `
              <span class="book-tag">+${book.topics.length - 2}</span>
            `
                : ""
            }
          </div>
        `
            : ""
        }
        ${
          bookCurriculum
            ? `
          <p class="book-tag curriculum">${bookCurriculum}</p>
        `
            : ""
        }
      </div>
    `;

    booksGrid.appendChild(bookCard);
  });

  initLazyLoading();
}

function clearFilters() {
  document.getElementById("searchInput").value = "";
  document.getElementById("topicSelect").selectedIndex = -1;
  document.getElementById("curriculumSelect").selectedIndex = -1;
  document.getElementById("activeFilters").innerHTML = "";
  updateResultsCount(books.length);
  renderBooks(books);
}

function setupMobileFilters() {
  const filterGroups = document.querySelectorAll(".filter-group");

  filterGroups.forEach((group) => {
    const heading = group.querySelector("h2");

    if (window.innerWidth <= 1024) {
      group.classList.remove("expanded");
    }

    heading.addEventListener("click", () => {
      if (window.innerWidth <= 1024) {
        group.classList.toggle("expanded");
      }
    });
  });
}

function handleBookSelect(book) {
  showLoading();

  fetch("/api/getBooks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ bookId: book.id }),
  })
    .then((response) => {
      if (!response.ok) throw new Error("Failed to fetch book");
      return response.json();
    })
    .then((data) => {
      showSuccess(book.title, data.pdfUrl);
    })
    .catch((error) => {
      showError("Failed to retrieve book PDF");
    })
    .finally(() => {
      hideLoading();
    });
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
    { rootMargin: "50px 0px" }
  );

  lazyImages.forEach((img) => imageObserver.observe(img));
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
  const topicSelect = document.getElementById("topicSelect");
  const curriculumSelect = document.getElementById("curriculumSelect");
  const clearFiltersBtn = document.getElementById("clearFilters");

  searchInput.addEventListener("input", filterBooks);
  topicSelect.addEventListener("change", filterBooks);
  curriculumSelect.addEventListener("change", filterBooks);
  clearFiltersBtn.addEventListener("click", clearFilters);
});

window.addEventListener("resize", () => {
  const filterGroups = document.querySelectorAll(".filter-group");

  filterGroups.forEach((group) => {
    if (window.innerWidth > 1024) {
      group.classList.add("expanded");
    }
  });
});
