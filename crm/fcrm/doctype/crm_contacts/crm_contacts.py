# Copyright (c) 2023, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class CRMContacts(Document):
    # begin: auto-generated types
    # This code is auto-generated. Do not modify anything in this block.

    from typing import TYPE_CHECKING

    if TYPE_CHECKING:
        from frappe.types import DF

        contact: DF.Link | None
        email: DF.Data | None
        full_name: DF.Data | None
        gender: DF.Link | None
        is_primary: DF.Check
        mobile_no: DF.Data | None
        parent: DF.Data
        parentfield: DF.Data
        parenttype: DF.Data
        phone: DF.Data | None
    # end: auto-generated types

    pass

    @staticmethod
    def default_list_data():
        columns = [
            {
                "label": "Contact",
                "type": "Link",
                "key": "contact",
                "width": "10rem",
                "align": "left",
            },
            {
                "label": "Name",
                "type": "Data",
                "key": "full_name",
                "width": "12rem",
            },
            {
                "label": "Email",
                "type": "Data",
                "key": "email",
                "width": "250px",
            },
            {
                "label": "Phone",
                "type": "Data",
                "key": "mobile_no",
                "width": "12rem",
            },
            {
                "label": "Landline",
                "type": "Data",
                "key": "phone",
                "width": "12rem",
            },
            {
                "label": "Primary",
                "type": "Check",
                "key": "is_primary",
                "width": "8rem",
            },
            {
                "label": "Last modified",
                "type": "Datetime",
                "key": "modified",
                "width": "8rem",
            },
            {
                "label": "Created on",
                "type": "Datetime",
                "key": "creation",
                "width": "10rem",
                "align": "left",
            },
        ]
        rows = [
            "name",
            "contact",
            "full_name",
            "email",
            "mobile_no",
            "phone",
            "is_primary",
            "modified",
            "creation",
        ]
        return {"columns": columns, "rows": rows}
