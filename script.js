document.addEventListener("DOMContentLoaded", () => {
  const videoPlayer = document.getElementById("videoPlayer"); // Video player element
  const videoSource = document.getElementById("videoSource"); // Video source element
  const playlist = document.getElementById("playlist"); // Playlist element
  const searchInput = document.getElementById("search"); // Search input element
  const sortToggleButton = document.getElementById("sortToggle"); // Sort toggle button

  let videos = []; // Array to store video data
  let isAscending = false; // Changed from true to false for descending order by default

  // Fetch releases from GitHub API
  async function fetchReleases() {
    const response = await fetch(
      "https://api.github.com/repos/TheDrillDown/TheDrillDown/releases"
    );
    const releases = await response.json();
    return releases;
  }

  // Filter videos based on search query
  function filterVideos(query) {
    return videos.filter(
      (video) =>
        video.name.toLowerCase().includes(query.toLowerCase()) ||
        video.body.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Sort videos by published date
  function sortVideos(ascending = true) {
    return videos.sort((a, b) => {
      const dateA = new Date(a.published_at);
      const dateB = new Date(b.published_at);
      return ascending ? dateA - dateB : dateB - dateA;
    });
  }

  // Update playlist with video data
  function updatePlaylist(videos) {
    const currentPlaying = document.querySelector("#playlist li.playing a");
    const currentPlayingTag = currentPlaying
      ? currentPlaying.getAttribute("href").substring(1)
      : null;

    playlist.innerHTML = "";
    videos.forEach((video) => {
      const li = document.createElement("li");
      li.addEventListener("click", () => {
        loadVideo(video);
      });
      const a = document.createElement("a");
      a.textContent = video.name;
      a.href = `#${video.tag_name}`;
      a.addEventListener("click", (event) => {
        event.preventDefault();
        loadVideo(video);
      });
      li.appendChild(a);
      playlist.appendChild(li);

      if (video.tag_name === currentPlayingTag) {
        li.classList.add("playing");
      }
    });
  }

  // Load video and update the episode info box
  function loadVideo(video) {
    videoSource.src = video.url;
    videoPlayer.load();
    videoPlayer.play().catch((error) => {
      console.error("Error playing video:", error); // Error handling
    });

    // Update the URL with the GitHub release tag
    window.history.pushState(null, null, `#${video.tag_name}`);

    // Create and update the episode info box
    updateEpisodeInfoBox(video);

    // Remove 'playing' class from all playlist items
    document.querySelectorAll("#playlist li").forEach((li) => {
      li.classList.remove("playing");
    });

    // Add 'playing' class to the current playlist item
    const currentItem = Array.from(playlist.children).find((li) =>
      li.querySelector(`a[href="#${video.tag_name}"]`)
    );
    if (currentItem) {
      currentItem.classList.add("playing");
    }
  }

  // Create or update the episode info box
  async function updateEpisodeInfoBox(video) {
    // Remove old episode link if it exists
    const oldEpisodeLink = document.getElementById("episodeLink");
    if (oldEpisodeLink) {
      oldEpisodeLink.remove();
    }

    // Get or create the info box container
    let infoBox = document.getElementById("episodeInfoBox");
    if (!infoBox) {
      infoBox = document.createElement("div");
      infoBox.id = "episodeInfoBox";
      videoPlayer.insertAdjacentElement("afterend", infoBox);
    }

    // Update the width to match current video player width
    updateInfoBoxWidth();

    // Clear previous content
    infoBox.innerHTML = "";

    // Create header with toggle button
    const header = document.createElement("div");
    header.className = "info-header";

    const title = document.createElement("h3");
    title.textContent = video.name;

    const toggleButton = document.createElement("span");
    toggleButton.textContent = "▼"; // Always use the down-pointing chevron character
    toggleButton.className = "toggle-button";

    header.appendChild(title);
    header.appendChild(toggleButton);
    infoBox.appendChild(header);

    // Create content container
    const content = document.createElement("div");
    content.className = "info-content";
    infoBox.appendChild(content);

    // Add description using marked.js library for Markdown conversion
    await loadMarkdownLibrary();

    const description = document.createElement("div");
    description.className = "markdown-body";

    // Create a preview container that will show the first 3 lines
    const previewContainer = document.createElement("div");
    previewContainer.className = "preview-container";

    // Add gradient overlay - make it 3x stronger
    const gradientOverlay = document.createElement("div");
    gradientOverlay.className = "gradient-overlay";

    // Add expand button
    const expandButton = document.createElement("button");
    expandButton.textContent = "Show More";
    expandButton.className = "expand-button";

    // Create show less button for expanded state
    const showLessButton = document.createElement("button");
    showLessButton.textContent = "Show Less";
    showLessButton.className = "show-less-button";

    // Parse markdown
    description.innerHTML = window.marked.parse(
      video.body || "No description available."
    );

    // Fix the spacing between title and content by adjusting markdown-body styles
    const previewMarkdown = description.cloneNode(true); // Clone for preview
    previewMarkdown.className = "markdown-body preview-markdown";

    // Add a clickable overlay to prevent clicking links in preview mode
    const clickBlocker = document.createElement("div");
    clickBlocker.className = "click-blocker";

    // Make only the "Show More" button clickable by forwarding click events
    clickBlocker.addEventListener("click", (e) => {
      if (!isExpanded) {
        // Prevent the original link click
        e.preventDefault();
        e.stopPropagation();
        // Trigger expand instead
        toggleExpand();
      }
    });

    // Append elements
    previewContainer.appendChild(previewMarkdown);
    previewContainer.appendChild(clickBlocker); // Add click blocker over preview content
    previewContainer.appendChild(gradientOverlay);
    previewContainer.appendChild(expandButton);

    // Add links - moved up before appending content to calculate correct height
    const links = document.createElement("div");
    links.className = "links-container";

    // Left button group
    const leftButtonGroup = document.createElement("div");
    leftButtonGroup.className = "button-group";

    // Download slide deck link (on left) - look for a PDF in the assets
    const slideDeckLink = document.createElement("a");
    // Find a slide deck PDF in the same release (if available)
    const slideDeckAsset = (release) =>
      release.assets.find(
        (asset) =>
          asset.name.toLowerCase().includes("slide") &&
          asset.name.endsWith(".pdf")
      );

    const allReleases = await fetchReleases();
    const currentRelease = allReleases.find(
      (r) => r.tag_name === video.tag_name
    );
    const slideAsset = currentRelease ? slideDeckAsset(currentRelease) : null;

    if (slideAsset) {
      slideDeckLink.href = slideAsset.browser_download_url;
      slideDeckLink.download = "";
      slideDeckLink.href = video.release_url;
      slideDeckLink.target = "_blank";
      slideDeckLink.textContent = "Download Slide Deck";
      slideDeckLink.className = "link-button slidedeck-button";
      leftButtonGroup.appendChild(slideDeckLink);
    }

    // Download video link (on left)
    const videoLink = document.createElement("a");
    videoLink.href = video.url;
    videoLink.textContent = "Download Video";
    videoLink.download = "";
    videoLink.className = "link-button video-button";
    leftButtonGroup.appendChild(videoLink);

    links.appendChild(leftButtonGroup);

    // GitHub release link (right aligned)
    const githubLink = document.createElement("a");
    githubLink.href = video.release_url;
    githubLink.textContent = "View on GitHub";
    githubLink.target = "_blank";
    githubLink.className = "link-button github-button";
    links.appendChild(githubLink);

    // Initially show preview and links - important: links are appended to content
    content.appendChild(previewContainer);
    content.appendChild(description);
    description.appendChild(showLessButton); // Add show less button to the full description
    content.appendChild(links); // Move links after both content elements
    description.style.display = "none"; // Hide full description initially

    // Toggle functionality
    let isExpanded = false;

    function toggleExpand() {
      // For collapsing animation, we need to set the starting height first
      if (isExpanded) {
        // When collapsing, first set the current height explicitly
        const fullHeight = description.offsetHeight + links.offsetHeight + 30;
        content.style.maxHeight = `${fullHeight}px`;

        // Force reflow to make sure the height is applied before changing it
        content.offsetHeight;

        // Make the preview container visible immediately but hidden behind the description
        // This ensures a smooth transition back to the preview
        previewContainer.style.display = "block";
        previewContainer.style.opacity = "0";
        previewContainer.style.position = "absolute";
        previewContainer.style.top = "15px"; // Same as content padding
        previewContainer.style.left = "15px";
        previewContainer.style.width = "calc(100% - 30px)";

        // Remove expanded classes
        header.classList.remove("expanded");
        content.classList.remove("content-expanded");
      }

      // Toggle state
      isExpanded = !isExpanded;

      if (isExpanded) {
        // Hide preview, show full description
        previewContainer.style.display = "none";
        description.style.display = "block";

        // Set the expanded height
        content.style.maxHeight = `${
          description.offsetHeight + links.offsetHeight + 30
        }px`; // 30px for padding

        // Add expanded classes
        header.classList.add("expanded");
        content.classList.add("content-expanded");

        // Scroll to make the expanded content visible if needed
        setTimeout(() => {
          const infoBoxRect = infoBox.getBoundingClientRect();
          const windowHeight = window.innerHeight;

          if (infoBoxRect.bottom > windowHeight) {
            const scrollTarget =
              window.scrollY + (infoBoxRect.bottom - windowHeight) + 50; // 50px extra space
            window.scrollTo({
              top: scrollTarget,
              behavior: "smooth",
            });
          }
        }, 100);
      } else {
        // Calculate the collapsed height with both preview and links
        const previewHeight = previewContainer.offsetHeight;
        const linksHeight = links.offsetHeight;
        content.style.maxHeight = `${previewHeight + linksHeight + 30}px`; // 30px for padding

        // Scroll back to show the video if needed
        const videoRect = videoPlayer.getBoundingClientRect();
        if (videoRect.top < 0) {
          window.scrollTo({
            top: window.scrollY + videoRect.top - 20,
            behavior: "smooth",
          });
        }

        // Wait for animation to complete, then switch display properties completely
        setTimeout(() => {
          if (!isExpanded) {
            // Check the state hasn't changed again
            previewContainer.style.opacity = "1";
            previewContainer.style.position = "relative";
            previewContainer.style.top = "auto";
            previewContainer.style.left = "auto";
            previewContainer.style.width = "auto";
            description.style.display = "none";
          }
        }, 300); // Matches the 0.3s transition duration
      }
    }

    // Connect buttons to the toggle function
    header.addEventListener("click", toggleExpand);
    expandButton.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent event bubbling to header
      if (!isExpanded) {
        toggleExpand();
      }
    });

    showLessButton.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent event bubbling
      if (isExpanded) {
        toggleExpand();
      }
    });

    // Initial state: collapsed, but showing preview and links fully
    // Calculate initial height with a small delay to ensure accurate measurements
    setTimeout(() => {
      const previewHeight = previewContainer.offsetHeight;
      const linksHeight = links.offsetHeight;
      content.style.maxHeight = `${previewHeight + linksHeight + 30}px`; // 30px for padding
    }, 10);
  }

  // Load the Marked.js library dynamically
  async function loadMarkdownLibrary() {
    if (window.marked) return; // Already loaded

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
      script.onload = () => {
        // Configure marked options
        window.marked.setOptions({
          breaks: true, // Add line breaks when \n is encountered
          gfm: true, // Use GitHub Flavored Markdown
          headerIds: true, // Add ids to headers for linking
          mangle: false, // Don't escape HTML
          sanitize: false, // Don't sanitize HTML
          smartLists: true, // Use smarter list behavior
          smartypants: true, // Use "smart" typographic punctuation
          xhtml: false, // Don't close empty tags with XHTML syntax
        });
        resolve();
      };
      script.onerror = () =>
        reject(new Error("Failed to load markdown library"));
      document.head.appendChild(script);
    });
  }

  // Function to update the info box width to match video player
  function updateInfoBoxWidth() {
    const infoBox = document.getElementById("episodeInfoBox");
    if (infoBox && videoPlayer) {
      const videoWidth = videoPlayer.offsetWidth;
      infoBox.style.width = `${videoWidth}px`;
    }
  }

  // Initialize the application
  async function init() {
    const releases = await fetchReleases();
    videos = releases.flatMap((release) =>
      release.assets
        // filter out non-video assets
        .filter((asset) => asset.name.endsWith(".mp4"))
        // map the video assets to an object with the video name, body, url, and published_at properties
        .map((asset) => ({
          name: release.name,
          body: release.body,
          url: asset.browser_download_url,
          published_at: release.published_at,
          tag_name: release.tag_name, // Add the tag name from the release
        }))
        // add the html_url property from the release to the video object
        .map((video) => {
          video.release_url = release.html_url;
          return video;
        })
    );
    const sortedVideos = sortVideos(isAscending);
    updatePlaylist(sortedVideos);

    // Check if URL contains a tag and play the corresponding video
    const videoTag = window.location.hash.substring(1);
    if (videoTag) {
      const videoToPlay = videos.find((video) => video.tag_name === videoTag);
      if (videoToPlay) {
        loadVideo(videoToPlay);
      }
    } else if (sortedVideos.length > 0) {
      // Auto-play the first video in the playlist if no specific video is requested
      loadVideo(sortedVideos[0]);
    }

    // Remove old episode link if exists - we're replacing it with the info box
    const oldEpisodeLink = document.getElementById("episodeLink");
    if (oldEpisodeLink) {
      oldEpisodeLink.remove();
    }

    // Add window resize listener to maintain correct info box width
    window.addEventListener("resize", updateInfoBoxWidth);
  }

  // Event listener for search input
  searchInput.addEventListener("input", () => {
    const query = searchInput.value;
    const filteredVideos = filterVideos(query);
    updatePlaylist(filteredVideos);
  });

  // Event listener for sort toggle button
  sortToggleButton.addEventListener("click", () => {
    const currentPlaying = document.querySelector("#playlist li.playing a");
    const currentPlayingTag = currentPlaying
      ? currentPlaying.getAttribute("href").substring(1)
      : null;

    isAscending = !isAscending;
    const sortedVideos = sortVideos(isAscending);
    updatePlaylist(sortedVideos);

    if (currentPlayingTag) {
      const currentItem = Array.from(playlist.children).find((li) =>
        li.querySelector(`a[href="#${currentPlayingTag}"]`)
      );
      if (currentItem) {
        currentItem.classList.add("playing");
      }
    }

    sortToggleButton.textContent = isAscending
      ? "Sort Descending"
      : "Sort Ascending";
  });

  // Set initial button text to match the default sort order
  sortToggleButton.textContent = isAscending
    ? "Sort Descending"
    : "Sort Ascending";

  init(); // Call init to start the application
});
