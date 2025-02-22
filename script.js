document.addEventListener("DOMContentLoaded", () => {
  const videoPlayer = document.getElementById("videoPlayer");
  const videoSource = document.getElementById("videoSource");
  const playlist = document.getElementById("playlist");
  const searchInput = document.getElementById("search");
  const sortToggleButton = document.getElementById("sortToggle");

  let videos = [];
  let isAscending = true;

  async function fetchReleases() {
    const response = await fetch(
      "https://api.github.com/repos/TheDrillDown/TheDrillDown/releases"
    );
    const releases = await response.json();
    console.log("Fetched releases:", releases); // Debugging line
    return releases;
  }

  function filterVideos(query) {
    return videos.filter(
      (video) =>
        video.name.toLowerCase().includes(query.toLowerCase()) ||
        video.body.toLowerCase().includes(query.toLowerCase())
    );
  }

  function sortVideos(ascending = true) {
    return videos.sort((a, b) => {
      const dateA = new Date(a.published_at);
      const dateB = new Date(b.published_at);
      return ascending ? dateA - dateB : dateB - dateA;
    });
  }

  function updatePlaylist(videos) {
    playlist.innerHTML = "";
    videos.forEach((video) => {
      const li = document.createElement("li");
      li.textContent = video.name;
      li.addEventListener("click", () => {
        console.log("Selected video URL:", video.url); // Debugging line
        videoSource.src = video.url;
        console.log("Video source set to:", videoSource.src); // Debugging line
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
            "See episode details and slide deck on GitHub";
          videoPlayer.insertAdjacentElement("afterend", episodeLink);
        }
        episodeLink.href = video.release_url;
      });
      playlist.appendChild(li);
    });
  }

  async function init() {
    const releases = await fetchReleases();
    videos = releases.flatMap((release) =>
      release.assets
        .filter((asset) => asset.name.endsWith(".mp4"))
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
    console.log("Fetched videos:", videos); // Debugging line
    const sortedVideos = sortVideos(isAscending);
    updatePlaylist(sortedVideos);
  }

  searchInput.addEventListener("input", () => {
    const query = searchInput.value;
    const filteredVideos = filterVideos(query);
    updatePlaylist(filteredVideos);
  });

  sortToggleButton.addEventListener("click", () => {
    isAscending = !isAscending;
    const sortedVideos = sortVideos(isAscending);
    updatePlaylist(sortedVideos);
    sortToggleButton.textContent = isAscending
      ? "Sort Descending"
      : "Sort Ascending";
  });

  init();
});
