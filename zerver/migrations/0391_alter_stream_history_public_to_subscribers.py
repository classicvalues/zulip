# Generated by Django 3.2.12 on 2022-04-27 15:42

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("zerver", "0390_fix_stream_history_public_to_subscribers"),
    ]

    operations = [
        migrations.AlterField(
            model_name="stream",
            name="history_public_to_subscribers",
            field=models.BooleanField(default=True),
        ),
    ]
