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
  if (apiKey === "") {
    alert("Please enter an API key");
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
        return { ...row, status };
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

    renderLayout(sortedUsers); // Using renderLayout instead of direct row creation

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

function renderLayout(rowsData) {
  const tableBody = document.getElementById('table-body');
  tableBody.innerHTML = '';

  rowsData.forEach((row, index) => {
    const status = formatStatus(row.status); // Using formatStatus function
    const attackLink = createAttackLink(row.id, row.status); // Using createAttackLink function
    tableBody.innerHTML += createTableRow(row, status, attackLink, index);
  });
}

function createTableRow(row, status, attackLink, index) {
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
      </td>
      <td class="hidden px-3 py-3.5 text-sm text-gray-500 dark:text-gray-300 lg:table-cell min-w-0 ${borderClass}">${row.lvl}</td>
      <td class="hidden px-3 py-3.5 text-sm text-gray-500 dark:text-gray-300 lg:table-cell min-w-0 ${borderClass}">${AddComma(row.BSP_total)} - (${FormatBattleStats(row.BSP_total)})</td>
      <td class="hidden px-3 py-3.5 text-sm text-gray-500 dark:text-gray-300 lg:table-cell min-w-0 ${borderClass}">${row.status}</td>
      <td class="relative py-3.5 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 min-w-0 ${borderClass}">
        ${attackLink}
      </td>
    </tr>
  `;
}
