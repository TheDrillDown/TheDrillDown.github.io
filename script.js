document.addEventListener("DOMContentLoaded", () => {
  const videoPlayer = document.getElementById("videoPlayer"); // Video player element
  const videoSource = document.getElementById("videoSource"); // Video source element
  const playlist = document.getElementById("playlist"); // Playlist element
  const searchInput = document.getElementById("search"); // Search input element
  const sortToggleButton = document.getElementById("sortToggle"); // Sort toggle button

  let videos = []; // Array to store video data
  let isAscending = true; // Sort order flag

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
    playlist.innerHTML = "";
    videos.forEach((video) => {
      const li = document.createElement("li");
      li.textContent = video.name;
      li.addEventListener("click", () => {
        videoSource.src = video.url;
        videoPlayer.load();
        videoPlayer.play().catch((error) => {
          console.error("Error playing video:", error); // Error handling
        });

        // Create and append the link to the GitHub Release
        let episodeLink = document.getElementById("episodeLink");
        if (!episodeLink) {
          episodeLink = document.createElement("a");
          episodeLink.id = "episodeLink";
          episodeLink.target = "_blank";
          episodeLink.textContent =
            "See episode summary and slide deck on GitHub";
          videoPlayer.insertAdjacentElement("afterend", episodeLink);
        }
        episodeLink.href = video.release_url;
      });
      playlist.appendChild(li);
    });
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
        }))
        // add the html_url property from the release to the video object
        .map((video) => {
          video.release_url = release.html_url;
          return video;
        })
    );
    const sortedVideos = sortVideos(isAscending);
    updatePlaylist(sortedVideos);
  }

  // Event listener for search input
  searchInput.addEventListener("input", () => {
    const query = searchInput.value;
    const filteredVideos = filterVideos(query);
    updatePlaylist(filteredVideos);
  });

  // Event listener for sort toggle button
  sortToggleButton.addEventListener("click", () => {
    isAscending = !isAscending;
    const sortedVideos = sortVideos(isAscending);
    updatePlaylist(sortedVideos);
    sortToggleButton.textContent = isAscending
      ? "Sort Descending"
      : "Sort Ascending";
  });

  init(); // Call init to start the application
});
