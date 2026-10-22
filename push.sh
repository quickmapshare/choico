#!/usr/bin/env bash
# Đẩy các commit trên nhánh hiện tại lên origin. Nếu còn thay đổi chưa commit thì hỏi lời nhắn rồi commit tất cả trước khi đẩy.
# Dùng: bash push.sh
set -euo pipefail

cd "$(dirname "$0")"

nhanh="$(git branch --show-current)"
if [ -z "$nhanh" ]; then
  echo "Không ở nhánh nào (detached HEAD). Dừng."
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Còn thay đổi chưa commit:"
  git status --short
  read -r -p "Lời nhắn commit (bỏ trống để dùng mặc định): " loi_nhan
  if [ -z "$loi_nhan" ]; then
    loi_nhan="Cập nhật $(date +%Y-%m-%d_%H:%M)"
  fi
  git add -A
  git commit -q -m "$loi_nhan"
  echo "Đã commit: $loi_nhan"
fi

git fetch -q origin
so_commit="$(git rev-list --count "origin/$nhanh..HEAD" 2>/dev/null || echo "?")"
if [ "$so_commit" = "0" ]; then
  echo "Không có commit nào mới trên $nhanh so với origin. Không cần đẩy."
  exit 0
fi

echo "Sắp đẩy $so_commit commit lên origin/$nhanh:"
git log --oneline "origin/$nhanh..HEAD" 2>/dev/null || git log --oneline -5
echo
read -r -p "Đẩy lên origin/$nhanh? [y/N] " tra_loi
case "$tra_loi" in
  y|Y|yes|YES) git push origin "$nhanh" ;;
  *) echo "Đã hủy."; exit 0 ;;
esac
