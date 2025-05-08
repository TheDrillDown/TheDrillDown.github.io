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

      // Set the width to match the video player
      infoBox.style.boxSizing = "border-box";
      infoBox.style.border = "1px solid #ccc";
      infoBox.style.borderRadius = "4px";
      infoBox.style.marginTop = "10px";
      infoBox.style.overflow = "hidden";
      infoBox.style.maxWidth = "100%"; // Prevent exceeding parent container width
    }

    // Update the width to match current video player width
    updateInfoBoxWidth();

    // Clear previous content
    infoBox.innerHTML = "";

    // Create header with toggle button
    const header = document.createElement("div");
    header.style.padding = "10px";
    header.style.backgroundColor = "#f5f5f5";
    header.style.cursor = "pointer";
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";

    const title = document.createElement("h3");
    title.textContent = video.name;
    title.style.margin = "0";

    const toggleButton = document.createElement("span");
    toggleButton.textContent = "▼"; // Always use the down-pointing chevron character
    toggleButton.style.transition = "transform 0.3s ease-in-out";
    toggleButton.style.display = "inline-block";
    toggleButton.style.transformOrigin = "center";

    header.appendChild(title);
    header.appendChild(toggleButton);
    infoBox.appendChild(header);

    // Create content container
    const content = document.createElement("div");
    content.style.padding = "15px";
    content.style.maxHeight = "0";
    content.style.overflow = "hidden";
    content.style.transition = "max-height 0.3s ease-out";
    infoBox.appendChild(content);

    // Add description using marked.js library for Markdown conversion
    await loadMarkdownLibrary();

    const description = document.createElement("div");
    description.className = "markdown-body";

    // Create a preview container that will show the first 3 lines
    const previewContainer = document.createElement("div");
    previewContainer.className = "preview-container";
    previewContainer.style.position = "relative";
    previewContainer.style.maxHeight = "4.5em"; // Approximately 3 lines of text
    previewContainer.style.overflow = "hidden";
    previewContainer.style.paddingBottom = "2px"; // Small space at bottom to avoid cutting off text

    // Add gradient overlay - make it 3x stronger
    const gradientOverlay = document.createElement("div");
    gradientOverlay.className = "gradient-overlay";
    gradientOverlay.style.position = "absolute";
    gradientOverlay.style.bottom = "0";
    gradientOverlay.style.left = "0";
    gradientOverlay.style.width = "100%";
    gradientOverlay.style.height = "3em"; // Increased height for stronger effect
    gradientOverlay.style.background =
      "linear-gradient(rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 40%, rgba(255,255,255,1) 100%)";
    gradientOverlay.style.pointerEvents = "none"; // Allow clicks to pass through

    // Add expand button
    const expandButton = document.createElement("button");
    expandButton.textContent = "Show More";
    expandButton.style.position = "absolute";
    expandButton.style.bottom = "0";
    expandButton.style.left = "50%";
    expandButton.style.transform = "translateX(-50%)";
    expandButton.style.padding = "4px 12px";
    expandButton.style.backgroundColor = "#f0f0f0";
    expandButton.style.border = "1px solid #ccc";
    expandButton.style.borderRadius = "4px";
    expandButton.style.cursor = "pointer";
    expandButton.style.zIndex = "1";
    expandButton.style.fontSize = "12px";

    // Create show less button for expanded state
    const showLessButton = document.createElement("button");
    showLessButton.textContent = "Show Less";
    showLessButton.style.margin = "15px auto 0";
    showLessButton.style.display = "block";
    showLessButton.style.padding = "4px 12px";
    showLessButton.style.backgroundColor = "#f0f0f0";
    showLessButton.style.border = "1px solid #ccc";
    showLessButton.style.borderRadius = "4px";
    showLessButton.style.cursor = "pointer";
    showLessButton.style.fontSize = "12px";

    // Parse markdown
    description.innerHTML = window.marked.parse(
      video.body || "No description available."
    );

    // Fix the spacing between title and content by adjusting markdown-body styles
    const previewMarkdown = description.cloneNode(true); // Clone for preview
    previewMarkdown.className = "markdown-body preview-markdown";

    // Add a clickable overlay to prevent clicking links in preview mode
    const clickBlocker = document.createElement("div");
    clickBlocker.style.position = "absolute";
    clickBlocker.style.top = "0";
    clickBlocker.style.left = "0";
    clickBlocker.style.width = "100%";
    clickBlocker.style.height = "100%";
    clickBlocker.style.zIndex = "5"; // Above content but below the show more button
    clickBlocker.style.cursor = "default";

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
    links.style.marginTop = "15px";
    links.style.display = "flex";
    links.style.gap = "10px";
    links.style.flexWrap = "wrap";
    links.style.justifyContent = "space-between"; // Distribute space for button layout

    // Left button group
    const leftButtonGroup = document.createElement("div");
    leftButtonGroup.style.display = "flex";
    leftButtonGroup.style.gap = "10px";

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
    } else {
      slideDeckLink.href = video.release_url;
      slideDeckLink.target = "_blank";
    }

    slideDeckLink.textContent = "Download Slide Deck";
    slideDeckLink.style.padding = "5px 10px";
    slideDeckLink.style.backgroundColor = "#28a745"; // Green color
    slideDeckLink.style.color = "white";
    slideDeckLink.style.textDecoration = "none";
    slideDeckLink.style.borderRadius = "4px";
    leftButtonGroup.appendChild(slideDeckLink);

    // Download video link (on left)
    const videoLink = document.createElement("a");
    videoLink.href = video.url;
    videoLink.textContent = "Download Video";
    videoLink.download = "";
    videoLink.style.padding = "5px 10px";
    videoLink.style.backgroundColor = "#0366d6";
    videoLink.style.color = "white";
    videoLink.style.textDecoration = "none";
    videoLink.style.borderRadius = "4px";
    leftButtonGroup.appendChild(videoLink);

    links.appendChild(leftButtonGroup);

    // GitHub release link (right aligned)
    const githubLink = document.createElement("a");
    githubLink.href = video.release_url;
    githubLink.textContent = "View on GitHub";
    githubLink.target = "_blank";
    githubLink.style.padding = "5px 10px";
    githubLink.style.backgroundColor = "#24292e";
    githubLink.style.color = "white";
    githubLink.style.textDecoration = "none";
    githubLink.style.borderRadius = "4px";
    githubLink.style.marginLeft = "auto"; // Push to the right
    links.appendChild(githubLink);

    // Initially show preview and links - important: links are appended to content
    content.appendChild(previewContainer);
    content.appendChild(description);
    description.appendChild(showLessButton); // Add show less button to the full description
    content.appendChild(links); // Move links after both content elements
    description.style.display = "none"; // Hide full description initially

    // Add GitHub markdown-like styles with reduced top margins for first elements
    const style = document.createElement("style");
    style.textContent = `
      .markdown-body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
        font-size: 16px;
        line-height: 1.5;
        word-wrap: break-word;
      }
      .markdown-body > *:first-child {
        margin-top: 0 !important;
      }
      .markdown-body h1, .markdown-body h2 {
        border-bottom: 1px solid #eaecef;
        padding-bottom: 0.3em;
      }
      .markdown-body h1, .markdown-body h2, .markdown-body h3, 
      .markdown-body h4, .markdown-body h5, .markdown-body h6 {
        margin-top: 24px;
        margin-bottom: 16px;
        font-weight: 600;
        line-height: 1.25;
      }
      .preview-markdown > *:first-child {
        margin-top: 0 !important;
      }
      .markdown-body code {
        padding: 0.2em 0.4em;
        margin: 0;
        font-size: 85%;
        background-color: rgba(27,31,35,0.05);
        border-radius: 3px;
        font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
      }
      .markdown-body pre {
        word-wrap: normal;
        padding: 16px;
        overflow: auto;
        font-size: 85%;
        line-height: 1.45;
        background-color: #f6f8fa;
        border-radius: 3px;
      }
      .markdown-body pre code {
        background-color: transparent;
        padding: 0;
      }
      .markdown-body a {
        color: #0366d6;
        text-decoration: none;
      }
      .markdown-body a:hover {
        text-decoration: underline;
      }
      .markdown-body blockquote {
        padding: 0 1em;
        color: #6a737d;
        border-left: 0.25em solid #dfe2e5;
        margin: 0 0 16px 0;
      }
      .markdown-body ul, .markdown-body ol {
        padding-left: 2em;
        margin-top: 0;
        margin-bottom: 16px;
      }
    `;
    content.appendChild(style);

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

        // Rotate chevron
        toggleButton.style.transform = "rotate(180deg)";
      } else {
        // Calculate the collapsed height with both preview and links
        const previewHeight = previewContainer.offsetHeight;
        const linksHeight = links.offsetHeight;
        content.style.maxHeight = `${previewHeight + linksHeight + 30}px`; // 30px for padding

        // Reset chevron rotation
        toggleButton.style.transform = "rotate(0deg)";

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
