"""Local disk file storage backend. Saves files under backend/uploads/."""
import os
import aiofiles


class LocalFileStorage:
    def __init__(self, base_dir: str | None = None):
        self.base_dir = base_dir or os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")

    async def save_file(self, relative_path: str, file, content_type: str | None = None) -> str:
        dest = os.path.join(self.base_dir, relative_path)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        async with aiofiles.open(dest, "wb") as out:
            file.file.seek(0)
            while chunk := file.file.read(65536):
                await out.write(chunk)
        return dest

    async def delete_file(self, relative_path: str) -> None:
        dest = os.path.join(self.base_dir, relative_path)
        if os.path.exists(dest):
            os.remove(dest)


storage = LocalFileStorage()
