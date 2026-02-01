import React from 'react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "./ui/avatar"

export function RecentSales() {
  return (
    <div className="space-y-8">
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarImage src="/avatars/01.png" alt="Avatar" />
          <AvatarFallback>ГС</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Г.Сараа</p>
          <p className="text-sm text-muted-foreground">
            saraa@example.com
          </p>
        </div>
        <div className="ml-auto font-medium">+₮150,000</div>
      </div>
      <div className="flex items-center">
        <Avatar className="flex h-9 w-9 items-center justify-center space-y-0 border">
          <AvatarImage src="/avatars/02.png" alt="Avatar" />
          <AvatarFallback>ББ</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Б.Болд</p>
          <p className="text-sm text-muted-foreground">
            bold@example.com
          </p>
        </div>
        <div className="ml-auto font-medium">+₮85,000</div>
      </div>
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarImage src="/avatars/03.png" alt="Avatar" />
          <AvatarFallback>НТ</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Н.Туяа</p>
          <p className="text-sm text-muted-foreground">
            tuya@example.com
          </p>
        </div>
        <div className="ml-auto font-medium">+₮45,000</div>
      </div>
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarImage src="/avatars/04.png" alt="Avatar" />
          <AvatarFallback>АД</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">А.Дорж</p>
          <p className="text-sm text-muted-foreground">
            dorj@example.com
          </p>
        </div>
        <div className="ml-auto font-medium">+₮250,000</div>
      </div>
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarImage src="/avatars/05.png" alt="Avatar" />
          <AvatarFallback>ЦХ</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Ц.Хулан</p>
          <p className="text-sm text-muted-foreground">
            khulan@example.com
          </p>
        </div>
        <div className="ml-auto font-medium">+₮120,000</div>
      </div>
    </div>
  )
}
