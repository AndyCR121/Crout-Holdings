"""XLSX / CSV decomposer — serialises cell key-value pairs to bytes."""

from __future__ import annotations

import csv
import io
from pathlib import Path

from .base import BaseDecomposer

try:
    import openpyxl
    _HAS_OPENPYXL = True
except ImportError:
    _HAS_OPENPYXL = False


class XlsxDecomposer(BaseDecomposer):
    """
    Strategy:
      XLSX → serialise every cell as "Sheet!R{row}C{col}={value}\n"
      CSV  → serialise every cell as "R{row}C{col}={value}\n"

    This preserves the key-value nature of spreadsheet data
    while staying independent of the binary XLSX container.

    Limitations:
      - Formulas stored as computed values (not formula strings)
      - Styles/formatting not preserved
      - Good for data fidelity; not for full workbook fidelity

    For full workbook fidelity (styles, charts, macros) use raw
    bytes like the PDF/DOCX decomposers.
    """

    def _is_csv(self) -> bool:
        return Path(self.file_path).suffix.lower() == ".csv"

    # ------------------------------------------------------------------
    # XLSX
    # ------------------------------------------------------------------

    def _xlsx_to_bytes(self) -> bytes:
        if not _HAS_OPENPYXL:
            raise ImportError("openpyxl is required: pip install openpyxl")
        wb = openpyxl.load_workbook(self.file_path, data_only=True)
        lines: list[str] = []
        for sheet_name in wb.sheetnames:
            ws = wb[sheet_name]
            for row in ws.iter_rows():
                for cell in row:
                    if cell.value is not None:
                        key = f"{sheet_name}!R{cell.row}C{cell.column}"
                        lines.append(f"{key}={cell.value}")
        payload = "\n".join(lines)
        return payload.encode("utf-8")

    def _bytes_to_xlsx(self, data: bytes, output_path: str) -> None:
        if not _HAS_OPENPYXL:
            raise ImportError("openpyxl is required: pip install openpyxl")
        wb = openpyxl.Workbook()
        ws_map: dict[str, object] = {}

        for line in data.decode("utf-8").splitlines():
            if "=" not in line:
                continue
            key, _, value = line.partition("=")
            # Parse "SheetName!R{row}C{col}"
            if "!R" in key and "C" in key:
                sheet_part, rc = key.split("!", 1)
                r_str, c_str = rc.lstrip("R").split("C", 1)
                row, col = int(r_str), int(c_str)
            else:
                continue

            if sheet_part not in ws_map:
                if sheet_part == "Sheet":
                    ws_map[sheet_part] = wb.active
                    wb.active.title = sheet_part  # type: ignore[union-attr]
                else:
                    ws_map[sheet_part] = wb.create_sheet(title=sheet_part)

            ws = ws_map[sheet_part]
            ws.cell(row=row, column=col, value=value)  # type: ignore[union-attr]

        wb.save(output_path)
        print(f"[XLSX] Recovered → {output_path}")

    # ------------------------------------------------------------------
    # CSV
    # ------------------------------------------------------------------

    def _csv_to_bytes(self) -> bytes:
        lines: list[str] = []
        with open(self.file_path, newline="", encoding="utf-8") as f:
            reader = csv.reader(f)
            for row_idx, row in enumerate(reader, start=1):
                for col_idx, value in enumerate(row, start=1):
                    if value:
                        lines.append(f"R{row_idx}C{col_idx}={value}")
        return "\n".join(lines).encode("utf-8")

    def _bytes_to_csv(self, data: bytes, output_path: str) -> None:
        grid: dict[tuple[int, int], str] = {}
        for line in data.decode("utf-8").splitlines():
            if "=" not in line:
                continue
            key, _, value = line.partition("=")
            r_str, c_str = key.lstrip("R").split("C", 1)
            grid[(int(r_str), int(c_str))] = value

        if not grid:
            return

        max_row = max(r for r, _ in grid)
        max_col = max(c for _, c in grid)

        with open(output_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            for r in range(1, max_row + 1):
                writer.writerow(
                    [grid.get((r, c), "") for c in range(1, max_col + 1)]
                )
        print(f"[CSV] Recovered → {output_path}")

    # ------------------------------------------------------------------
    # BaseDecomposer interface
    # ------------------------------------------------------------------

    def to_bytes(self) -> bytes:
        if self._is_csv():
            return self._csv_to_bytes()
        return self._xlsx_to_bytes()

    def from_bytes(self, data: bytes, output_path: str) -> None:
        if Path(output_path).suffix.lower() == ".csv":
            self._bytes_to_csv(data, output_path)
        else:
            self._bytes_to_xlsx(data, output_path)
