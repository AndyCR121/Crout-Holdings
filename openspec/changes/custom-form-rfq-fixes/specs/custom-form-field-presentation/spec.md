## Purpose

Defines how the custom-form renderer presents section navigation and field-level guidance to a submitter, independent of validation rules.

## ADDED Requirements

### Requirement: Section tabs remain visible while scrolling
The system SHALL keep a multi-section custom form's tab bar visible at the top of its scrollable area while the submitter scrolls through the active section's fields.

#### Scenario: Tab bar stays pinned during scroll
- **WHEN** a submitter scrolls down within a form section that has enough fields to require scrolling
- **THEN** the tab bar for that form remains visible at the top of the scrollable area and every tab remains selectable

### Requirement: Optional hint text below a field
The system SHALL render an optional hint/description string directly below a form field's control when the form builder has configured one for that field, visually distinct from the field's label and from any validation error message. The system SHALL render no hint element for a field with none configured.

#### Scenario: Configured hint is shown
- **WHEN** a form field has a hint/description configured
- **THEN** the form renders that text directly below the field's control

#### Scenario: No hint configured
- **WHEN** a form field has no hint/description configured
- **THEN** no hint element is rendered for that field
