export function doneTodayEl(logs, { selectedUuid, onSetClick } = {}) {
  const section = document.createElement('div');
  section.className = 'done-today';

  const label = document.createElement('p');
  label.className = 'done-today__label';
  label.textContent = 'Виконано сьогодні';
  section.appendChild(label);

  if (logs.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'done-today__empty';
    empty.textContent = 'Ще немає записів';
    section.appendChild(empty);
    return section;
  }

  const list = document.createElement('div');
  list.className = 'done-today__list';

  logs.forEach((log, i) => {
    const row = document.createElement('div');
    const isSelected = log.uuid === selectedUuid;
    row.className = `done-today__row${onSetClick ? ' done-today__row--tappable' : ''}${isSelected ? ' done-today__row--editing' : ''}`;

    if (onSetClick) {
      row.addEventListener('click', () => onSetClick(log, i));
    }

    const volume = log.weight * log.reps;

    const setNum = document.createElement('span');
    setNum.className = 'done-today__set-num';
    setNum.textContent = `Сет ${i + 1}`;

    const values = document.createElement('span');
    values.className = 'done-today__values';
    values.textContent = `${log.weight} кг × ${log.reps}`;

    const vol = document.createElement('span');
    vol.className = 'done-today__volume';
    vol.textContent = `${volume} кг`;

    const editIcon = document.createElement('span');
    editIcon.className = 'done-today__edit-icon';
    editIcon.textContent = isSelected ? '✕' : '✎';

    row.appendChild(setNum);
    row.appendChild(values);
    row.appendChild(vol);
    row.appendChild(editIcon);
    list.appendChild(row);
  });

  section.appendChild(list);
  return section;
}
