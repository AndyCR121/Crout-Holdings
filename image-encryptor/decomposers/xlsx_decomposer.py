"""Spreadsheet decomposer using cell-level semantic entries."""

from __future__ import annotations

import csv
from pathlib import Path
from typing import Any

from .base import BaseDecomposer

try:
    import openpyxl
    _HAS_OPENPYXL = True
except ImportError:
    _HAS_OPENPYXL = False


class XlsxDecomposer(BaseDecomposer):
    def _is_csv(self) -> bool:
        return Path(self.file_path).suffix.lower() == ".csv"

    def to_entries(self) -> list[tuple[str, Any]]:
        if self._is_csv():
            return self._csv_to_entries()
        return self._xlsx_to_entries()

    def _csv_to_entries(self) -> list[tuple[str, Any]]:
        entries: list[tuple[str, Any]] = [("meta.original_extension", "csv")]
        with open(self.file_path, newline="", encoding="utf-8") as f:
            reader = csv.reader(f)
            for r, row in enumerate(reader, start=1):
                for c, value in enumerate(row, start=1):
                    if value != "":
                        entries.append((f"R{r}C{c}", value))
        return entries

    def _xlsx_to_entries(self) -> list[tuple[str, Any]]:
        if not _HAS_OPENPYXL:
            raise ImportError("openpyxl is required for XLSX support")

        wb = openpyxl.load_workbook(self.file_path, data_only=True)
        entries: list[tuple[str, Any]] = [("meta.original_extension", "xlsx")]

        for sheet_name in wb.sheetnames:
            ws = wb[sheet_name]
            for row in ws.iter_rows():
                for cell in row:
                    if cell.value is not None:
                        entries.append((f"{sheet_name}!R{cell.row}C{cell.column}", cell.value))
        return entries

    def from_entries(self, entries: list[tuple[str, Any]], output_path: str) -> None:
        ext = Path(output_path).suffix.lower()
        if ext == ".csv":
            self._entries_to_csv(entries, output_path)
        else:
            self._entries_to_xlsx(entries, output_path)

    def _entries_to_csv(self, entries: list[tuple[str, Any]], output_path: str) -> None:
        grid: dict[tuple[int, int], str] = {}
        for key, value in entries:
            if not key.startswith("R") or "C" not in key:
                continue
            r_str, c_str = key[1:].split("C", 1)
            grid[(int(r_str), int(c_str))] = str(value)

        max_row = max((r for r, _ in grid), default=0)
        max_col = max((c for _, c in grid), default=0)

        with open(output_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            for r in range(1, max_row + 1):
                writer.writerow([grid.get((r, c), "") for c in range(1, max_col + 1)])

    def _entries_to_xlsx(self, entries: list[tuple[str, Any]], output_path: str) -> None:
        if not _HAS_OPENPYXL:
            raise ImportError("openpyxl is required for XLSX support")

        wb = openpyxl.Workbook()
        ws_map: dict[str, Any] = {"Sheet": wb.active}
        wb.active.title = "Sheet"

        for key, value in entries:
            if "!R" not in key or "C" not in key:
                continue
            sheet_name, rc = key.split("!", 1)
            r_str, c_str = rc[1:].split("C", 1)
            row, col = int(r_str), int(c_str)

            if sheet_name not in ws_map:
                ws_map[sheet_name] = wb.create_sheet(title=sheet_name)
            ws_map[sheet_name].cell(row=row, column=col, value=value)

        wb.save(output_path)
