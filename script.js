let tableData = [];
let timer;
let statusUpdateInterval;

async function loadListNames() {
  try {
    const response = await fetch("data.json");
    const data = await response.json();
    const listSelect = document.getElementById("list-select");
    for (const listName in data) {
      const option = document.createElement("option");
      option.value = listName;
      option.textContent = listName;
      listSelect.appendChild(option);
    }
  } catch (error) {
    console.error("Error loading list names:", error);
  }
}

async function fetchData() {
  const apiKey = document.getElementById("api-key").value;
  const yourStats = parseInt(document.getElementById("your-stats").value); // Get user's stats
  if (apiKey === "" || isNaN(yourStats)) {
    alert("Please enter a valid API key and Your Stats");
    return;
  }

  const listSelect = document.getElementById("list-select");
  const selectedList = listSelect.value;

  if (!selectedList) {
    return;
  }

  const fetchButton = document.getElementById("fetch-button");
  fetchButton.disabled = true;
  startCountdown();

  showLoadingIndicator();
  hideDataTable();

  try {
    const response = await fetch("data.json");
    const data = await response.json();
    const tableData = data[selectedList];

    if (tableData.length === 0) {
      displayNoDataMessage();
      hideLoadingIndicator();
      return;
    }

    const userPromises = tableData.map(async (row) => {
      const apiUrl = `https://api.torn.com/user/${row.id}?selections=basic&key=${apiKey}`;
      try {
        const userResponse = await fetch(apiUrl);
        const userData = await userResponse.json();
        const status = formatStatus(userData.status);
        
        // Add difficulty calculation
        const difficulty = calculateDifficulty(row.BSP_total, yourStats);
        return { ...row, status, difficulty };
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    });

    const usersWithStatus = await Promise.all(userPromises);

    // Sorting users
    const sortedUsers = usersWithStatus.sort((a, b) => {
      const aBSP = parseFloat(a.BSP_total) || 0;
      const bBSP = parseFloat(b.BSP_total) || 0;
      const aTotal = parseFloat(a.total) || 0;
      const bTotal = parseFloat(b.total) || 0;
      
      if (aBSP !== bBSP) return bBSP - aBSP;
      return bTotal - aTotal;
    });

    renderLayout(sortedUsers, yourStats); // Pass the user's stats for rendering

    hideNoDataMessage();
    displayDataTable();

    clearInterval(statusUpdateInterval);
    statusUpdateInterval = setInterval(() => {
      updateStatus();
    }, 1000);

    hideLoadingIndicator();
  } catch (error) {
    console.error("Error fetching data:", error);
    hideLoadingIndicator();
  }
}

function calculateDifficulty(bspTotal, yourStats) {
  if (bspTotal < (yourStats * 0.5)) {
    return "Very Easy";
  } else if (bspTotal < (yourStats * 0.9)) {
    return "Easy";
  } else if (bspTotal <= (yourStats * 1.1)) {
    return "Even";
  } else if (bspTotal <= (yourStats * 3)) {
    return "Tough";
  } else if (bspTotal <= (yourStats * 6)) {
    return "Very Tough";
  } else {
    return "Too Hard";
  }
}

function renderLayout(rowsData, yourStats) {
  const tableBody = document.getElementById('table-body');
  tableBody.innerHTML = '';

  // Remove any existing cards container if necessary
  const oldCardsContainer = document.getElementById('cards-container');
  if (oldCardsContainer) {
    oldCardsContainer.remove();
  }

  const isSmallScreen = window.matchMedia('(max-width: 640px)').matches;

  if (isSmallScreen) {
    const cardsContainer = document.createElement('div');
    cardsContainer.id = 'cards-container';
    document.getElementById('data-table').prepend(cardsContainer);

    rowsData.forEach((row, index) => {
      const status = formatStatus(row.status);
      const attackLink = createAttackLink(row.id, row.status);
      const difficulty = row.difficulty;
      cardsContainer.innerHTML += createCard(row, status, attackLink, difficulty); // Pass difficulty to card function
    });
  } else {
    rowsData.forEach((row, index) => {
      const status = formatStatus(row.status);
      const attackLink = createAttackLink(row.id, row.status);
      const difficulty = row.difficulty;
      tableBody.innerHTML += createTableRow(row, status, attackLink, difficulty, index); // Pass difficulty to row function
    });
  }
}

function createCard(row, status, attackLink, difficulty) {
  return `
    <div class="card mb-4 border border-gray-200 p-4 rounded-lg shadow-sm">
      <div class="text-sm sm:hidden">
        <div class="font-medium text-gray-900 dark:text-gray-300">
          <a href="https://www.torn.com/profiles.php?XID=${row.id}" target="_blank">
            ${row.name}
            <span class="ml-1 text-blue-600">[${row.id}]</span>
          </a>
        </div>
        <div class="mt-1 flex flex-col text-gray-500 dark:text-gray-300">
          <span>Level: ${row.lvl}</span>
          <span class="bsp-total">BSP Total: ${AddComma(row.BSP_total)} - (${FormatBattleStats(row.BSP_total)})</span>
          <span>Total: ${row.total}</span>
          <span>Status: ${row.status}</span>
          <span>Difficulty: ${difficulty}</span> <!-- Added difficulty here -->
        </div>
        <div class="mt-2 text-sm text-center">
          ${attackLink}
        </div>
      </div>
    </div>
  `;
}

function createTableRow(row, status, attackLink, difficulty, index) {
  const isNotFirst = index > 0;
  const borderClass = isNotFirst ? 'border-t border-gray-200' : '';

  return `
    <tr>
      <td class="relative py-4 pl-4 pr-3 text-sm sm:pl-6 min-w-0 ${borderClass}">
        <div class="font-medium text-gray-900 dark:text-gray-300">
            <a href="https://www.torn.com/profiles.php?XID=${row.id}" target="_blank">
              ${row.name}
              <span class="ml-1 text-blue-600">[${row.id}]</span>
            </a>
        </div>
        <div class="mt-1 flex flex-col text-gray-500 dark:text-gray-300 sm:block lg:hidden">
            <span>Level: ${row.lvl}</span>
            <span>Total: ${AddComma(row.BSP_total)} - (${FormatBattleStats(row.BSP_total)})</span>
        </div>
      </td>
      <td class="hidden px-3 py-3.5 text-sm text-gray-500 dark:text-gray-300 lg:table-cell min-w-0 ${borderClass}">${row.lvl}</td>
      <td class="hidden px-3 py-3.5 text-sm text-gray-500 dark:text-gray-300 lg:table-cell min-w-0 ${borderClass}">${AddComma(row.BSP_total)} - (${FormatBattleStats(row.BSP_total)})</td>
      <td class="hidden px-3 py-3.5 text-sm text-gray-500 dark:text-gray-300 lg:table-cell min-w-0 ${borderClass}">${row.str}</td>
      <td class="hidden px-3 py-3.5 text-sm text-gray-500 dark:text-gray-300 lg:table-cell min-w-0 ${borderClass}">${row.def}</td>
      <td class="hidden px-3 py-3.5 text-sm text-gray-500 dark:text-gray-300 lg:table-cell min-w-0 ${borderClass}">${row.spd}</td>
      <td class="hidden px-3 py-3.5 text-sm text-gray-500 dark:text-gray-300 lg:table-cell min-w-0 ${borderClass}">${row.dex}</td>
      <td class="hidden px-3 py-3.5 text-sm text-gray-500 dark:text-gray-300 lg:table-cell min-w-0 ${borderClass}">${row.status}</td>
      <td class="hidden px-3 py-3.5 text-sm text-gray-500 dark:text-gray-300 lg:table-cell min-w-0 ${borderClass}">${difficulty}</td> <!-- Added difficulty column -->
      <td class="relative py-3.5 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 min-w-0 ${borderClass}">
        ${attackLink}
      </td>
    </tr>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  loadListNames();
});
