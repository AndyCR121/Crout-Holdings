"""File decomposer sub-package."""

from .pdf_decomposer import PdfDecomposer
from .docx_decomposer import DocxDecomposer
from .xlsx_decomposer import XlsxDecomposer
from .image_decomposer import ImageDecomposer
from .base import BaseDecomposer

__all__ = [
    "BaseDecomposer",
    "PdfDecomposer",
    "DocxDecomposer",
    "XlsxDecomposer",
    "ImageDecomposer",
]
